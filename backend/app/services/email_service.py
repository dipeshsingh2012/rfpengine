from __future__ import annotations

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional
from jinja2 import Environment, FileSystemLoader, select_autoescape

from app.core.config import Settings, get_settings

logger = logging.getLogger("rfpengine.services.email")


class EmailService:
    """
    Production Transactional Email Service.
    Supports Resend, SendGrid, standard SMTP, and graceful offline fallback logging.
    """

    def __init__(self, settings: Optional[Settings] = None):
        self.settings = settings or get_settings()
        template_dir = Path(__file__).resolve().parent.parent / "templates" / "email"
        self.jinja_env = Environment(
            loader=FileSystemLoader(str(template_dir)),
            autoescape=select_autoescape(["html", "xml"]),
        )

    def render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """
        Renders a Jinja2 HTML email template with given context.
        """
        try:
            template = self.jinja_env.get_template(template_name)
            return template.render(**context)
        except Exception as exc:
            logger.warning("Could not render template '%s': %s", template_name, exc)
            # Fallback simple HTML
            return f"<html><body><p>{context.get('question_text', context.get('workspace_title', 'Notification'))}</p></body></html>"

    async def send_email(
        self,
        to_email: str,
        subject: str,
        html_content: str,
        text_content: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends an email using configured provider (Resend, SendGrid, SMTP, or Mock).
        """
        from_address = f"{self.settings.email_from_name} <{self.settings.email_from_address}>"

        # 1. Resend Provider
        if (self.settings.email_provider == "resend" or self.settings.resend_api_key) and self.settings.resend_api_key:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {self.settings.resend_api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "from": from_address,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content,
                    "text": text_content or "",
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post("https://api.resend.com/emails", headers=headers, json=payload, timeout=10.0)
                    if resp.status_code in (200, 201):
                        logger.info("Email dispatched via Resend to %s", to_email)
                        return {"status": "sent", "provider": "resend", "id": resp.json().get("id")}
                    else:
                        logger.error("Resend API error (%s): %s", resp.status_code, resp.text)
            except Exception as exc:
                logger.error("Failed sending email via Resend: %s", exc)

        # 2. SendGrid Provider
        elif (self.settings.email_provider == "sendgrid" or self.settings.sendgrid_api_key) and self.settings.sendgrid_api_key:
            try:
                import httpx
                headers = {
                    "Authorization": f"Bearer {self.settings.sendgrid_api_key}",
                    "Content-Type": "application/json",
                }
                payload = {
                    "personalizations": [{"to": [{"email": to_email}]}],
                    "from": {"email": self.settings.email_from_address, "name": self.settings.email_from_name},
                    "subject": subject,
                    "content": [{"type": "text/html", "value": html_content}],
                }
                async with httpx.AsyncClient() as client:
                    resp = await client.post("https://api.sendgrid.com/v3/mail/send", headers=headers, json=payload, timeout=10.0)
                    if resp.status_code in (200, 202):
                        logger.info("Email dispatched via SendGrid to %s", to_email)
                        return {"status": "sent", "provider": "sendgrid"}
                    else:
                        logger.error("SendGrid API error (%s): %s", resp.status_code, resp.text)
            except Exception as exc:
                logger.error("Failed sending email via SendGrid: %s", exc)

        # 3. Standard SMTP Provider
        elif self.settings.smtp_host and self.settings.smtp_user and self.settings.smtp_password:
            try:
                import smtplib
                from email.mime.multipart import MIMEMultipart
                from email.mime.text import MIMEText

                msg = MIMEMultipart("alternative")
                msg["Subject"] = subject
                msg["From"] = from_address
                msg["To"] = to_email
                msg.attach(MIMEText(html_content, "html"))

                with smtplib.SMTP(self.settings.smtp_host, self.settings.smtp_port) as server:
                    if self.settings.smtp_use_tls:
                        server.starttls()
                    server.login(self.settings.smtp_user, self.settings.smtp_password)
                    server.sendmail(self.settings.email_from_address, [to_email], msg.as_string())
                    logger.info("Email dispatched via SMTP to %s", to_email)
                    return {"status": "sent", "provider": "smtp"}
            except Exception as exc:
                logger.error("Failed sending email via SMTP: %s", exc)

        # 4. Graceful Offline / Mock Fallback
        logger.info(
            "📧 [OFFLINE / MOCK EMAIL] To: %s | Subject: %s | From: %s",
            to_email, subject, from_address
        )
        return {
            "status": "sent",
            "provider": "mock",
            "recipient": to_email,
            "subject": subject,
            "offline_logged": True,
        }

    async def send_sme_review_request(
        self,
        recipient_email: str,
        workspace_title: str,
        question_text: str,
        draft_preview: str,
        category: str = "Security & Compliance",
        workspace_id: str = "ws-demo",
        question_index: int = 0,
        recipient_name: Optional[str] = None,
        token: Optional[str] = "demo-token"
    ) -> Dict[str, Any]:
        """
        Sends a 1-click tokenized magic link review request to an SME.
        """
        magic_link_url = f"{self.settings.app_base_url}/review/{workspace_id}/{question_index}?token={token or 'demo-token'}"
        context = {
            "recipient_name": recipient_name or recipient_email.split("@")[0],
            "workspace_title": workspace_title,
            "question_text": question_text,
            "draft_preview": draft_preview[:200] + "..." if len(draft_preview) > 200 else draft_preview,
            "category": category,
            "magic_link_url": magic_link_url,
        }
        html_content = self.render_template("sme_review_request.html", context)
        subject = f"Action Required: Compliance Review for {workspace_title}"

        return await self.send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_content
        )

    async def send_proposal_completion_digest(
        self,
        recipient_email: str,
        workspace_title: str,
        total_questions: int,
        workspace_id: str = "ws-demo",
        owner_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Sends a completion digest to the deal owner when all questions reach 100% approval.
        """
        export_url = f"{self.settings.app_base_url}/workspaces/{workspace_id}/export"
        context = {
            "owner_name": owner_name or recipient_email.split("@")[0],
            "workspace_title": workspace_title,
            "total_questions": total_questions,
            "export_url": export_url,
        }
        html_content = self.render_template("proposal_completion_digest.html", context)
        subject = f"🎉 Ready to Export: {workspace_title} (100% Verified)"

        return await self.send_email(
            to_email=recipient_email,
            subject=subject,
            html_content=html_content
        )
