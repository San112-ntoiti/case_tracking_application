"""
Report generation views.
Uses ?export=csv or ?export=pdf to avoid collision with DRF's built-in
?format= URL suffix handling (which intercepts format= before our view runs).
"""
import csv
import io
from datetime import datetime

from django.http import HttpResponse
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated

from accounts.permissions import IsCourtAdmin
from .models import TrackedCase, Case, CaseEvent


class TrackedCasesReportView(APIView):
    """
    GET /api/v1/cases/reports/tracked/?export=csv|pdf
    Exports the authenticated user's tracked cases list.
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        fmt = request.query_params.get("export", "csv").lower()
        tracked = TrackedCase.objects.filter(
            user=request.user
        ).select_related("case__court").order_by("-created_at")

        if fmt == "pdf":
            return self._pdf(request.user, tracked)
        return self._csv(tracked)

    def _csv(self, tracked):
        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="tracked_cases.csv"'
        writer = csv.writer(response)
        writer.writerow([
            "Case Number", "Case Type", "Court", "Status",
            "Next Mention Date", "Next Hearing Date", "Tracked Since",
        ])
        for t in tracked:
            c = t.case
            writer.writerow([
                c.case_number, c.case_type, c.court.name, c.status,
                c.next_mention_date or "", c.next_hearing_date or "",
                t.created_at.strftime("%Y-%m-%d"),
            ])
        return response

    def _pdf(self, user, tracked):
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib import colors
            from reportlab.lib.units import cm
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet

            buf = io.BytesIO()
            doc = SimpleDocTemplate(
                buf, pagesize=A4,
                leftMargin=2*cm, rightMargin=2*cm, topMargin=2*cm, bottomMargin=2*cm,
            )
            styles = getSampleStyleSheet()
            story  = []

            story.append(Paragraph("Kenya Court Case Tracker", styles["Title"]))
            story.append(Paragraph(f"Tracked Cases — {user.full_name}", styles["Normal"]))
            story.append(Paragraph(f"Generated: {datetime.now().strftime('%d %B %Y, %H:%M')}", styles["Normal"]))
            story.append(Spacer(1, 0.5*cm))

            data = [["Case Number", "Court", "Status", "Next Hearing", "Tracked Since"]]
            for t in tracked:
                c = t.case
                data.append([
                    c.case_number, c.court.name[:25], c.status,
                    str(c.next_hearing_date or "—"),
                    t.created_at.strftime("%Y-%m-%d"),
                ])

            table = Table(data, colWidths=[4*cm, 5*cm, 3*cm, 3.5*cm, 3.5*cm])
            table.setStyle(TableStyle([
                ("BACKGROUND",    (0, 0), (-1, 0),  colors.HexColor("#0F2A4A")),
                ("TEXTCOLOR",     (0, 0), (-1, 0),  colors.white),
                ("FONTNAME",      (0, 0), (-1, 0),  "Helvetica-Bold"),
                ("FONTSIZE",      (0, 0), (-1, -1), 9),
                ("ROWBACKGROUNDS",(0, 1), (-1, -1),  [colors.white, colors.HexColor("#F0ECE2")]),
                ("GRID",          (0, 0), (-1, -1),  0.5, colors.HexColor("#D0D8E8")),
                ("TOPPADDING",    (0, 0), (-1, -1),  5),
                ("BOTTOMPADDING", (0, 0), (-1, -1),  5),
            ]))
            story.append(table)
            doc.build(story)

            buf.seek(0)
            response = HttpResponse(buf, content_type="application/pdf")
            response["Content-Disposition"] = 'attachment; filename="tracked_cases.pdf"'
            return response

        except ImportError:
            return HttpResponse(
                "PDF generation requires reportlab. Use ?export=csv instead.",
                status=500,
                content_type="text/plain",
            )


class CaseActivityReportView(APIView):
    """
    GET /api/v1/cases/reports/activity/?export=csv
    Court Admin / Sys Admin: event counts grouped by court and type.
    """
    permission_classes = [IsCourtAdmin]

    def get(self, request):
        from django.db.models import Count

        events = (
            CaseEvent.objects
            .select_related("case__court")
            .values("case__court__name", "event_type")
            .annotate(count=Count("id"))
            .order_by("case__court__name", "event_type")
        )

        response = HttpResponse(content_type="text/csv")
        response["Content-Disposition"] = 'attachment; filename="case_activity.csv"'
        writer = csv.writer(response)
        writer.writerow(["Court", "Event Type", "Count"])
        for row in events:
            writer.writerow([row["case__court__name"], row["event_type"], row["count"]])
        return response
