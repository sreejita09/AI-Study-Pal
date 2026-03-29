"""Email service for sending verification emails"""
import secrets
from flask_mail import Mail, Message
import os

mail = Mail()


def build_verification_link(verification_token):
    """Build email verification link for local/dev use."""
    return f"http://127.0.0.1:5000/auth/verify-email/{verification_token}"


def is_email_configured():
    """Check whether real SMTP credentials are configured."""
    return bool(os.getenv('MAIL_USERNAME')) and os.getenv('MAIL_USERNAME') != 'your-email@gmail.com'

def generate_verification_token():
    """Generate a secure verification token"""
    return secrets.token_urlsafe(32)

def send_verification_email(user_email, username, verification_token):
    """Send email verification link"""
    try:
        # Check if we're in development mode without email config
        if not is_email_configured():
            print(f"[DEV MODE] Verification link would be sent to {user_email}")
            print(f"[DEV MODE] Link: {build_verification_link(verification_token)}")
            return True
        
        verification_link = build_verification_link(verification_token)
        
        msg = Message(
            subject='Verify Your AI Study Pal Account',
            recipients=[user_email],
            html=f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #0f1419; color: #e5e7eb; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #1a1f2e; border-radius: 12px; padding: 30px; border: 1px solid #2d3748;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #fbbf24; margin: 0;">AI Study Pal</h1>
                            <p style="color: #9ca3af; margin: 10px 0 0 0;">Verify Your Email Address</p>
                        </div>
                        
                        <p style="color: #e5e7eb; font-size: 15px; margin-bottom: 20px;">
                            Hi <strong>{username}</strong>,
                        </p>
                        
                        <p style="color: #e5e7eb; font-size: 15px; margin-bottom: 20px;">
                            Welcome to AI Study Pal! Please verify your email address to complete your registration and start using our study tools.
                        </p>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="{verification_link}" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #1f2937; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                                Verify Email Address
                            </a>
                        </div>
                        
                        <p style="color: #9ca3af; font-size: 13px; margin-top: 30px;">
                            Or copy and paste this link in your browser:
                        </p>
                        <p style="color: #fbbf24; font-size: 12px; word-break: break-all; background: #252d3d; padding: 10px; border-radius: 6px;">
                            {verification_link}
                        </p>
                        
                        <p style="color: #9ca3af; font-size: 13px; margin-top: 20px;">
                            This link will expire in 24 hours.
                        </p>
                        
                        <hr style="border: none; border-top: 1px solid #2d3748; margin: 30px 0;">
                        
                        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                            If you didn't create this account, please ignore this email.
                        </p>
                    </div>
                </body>
            </html>
            """
        )
        
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending verification email: {str(e)}")
        return False

def send_welcome_email(user_email, username):
    """Send welcome email after verification"""
    try:
        if not is_email_configured():
            return True
        
        msg = Message(
            subject='Welcome to AI Study Pal!',
            recipients=[user_email],
            html=f"""
            <html>
                <body style="font-family: Arial, sans-serif; background-color: #0f1419; color: #e5e7eb; padding: 20px;">
                    <div style="max-width: 600px; margin: 0 auto; background-color: #1a1f2e; border-radius: 12px; padding: 30px; border: 1px solid #2d3748;">
                        <div style="text-align: center; margin-bottom: 30px;">
                            <h1 style="color: #fbbf24; margin: 0;">AI Study Pal</h1>
                            <p style="color: #9ca3af; margin: 10px 0 0 0;">Your Account is Ready!</p>
                        </div>
                        
                        <p style="color: #e5e7eb; font-size: 15px; margin-bottom: 20px;">
                            Hi <strong>{username}</strong>,
                        </p>
                        
                        <p style="color: #e5e7eb; font-size: 15px; margin-bottom: 20px;">
                            Your email has been verified successfully! You can now log in to your AI Study Pal account and start using our study tools.
                        </p>
                        
                        <h3 style="color: #fbbf24; margin-top: 30px;">Get Started:</h3>
                        <ul style="color: #e5e7eb; font-size: 14px;">
                            <li style="margin-bottom: 10px;">📚 <strong>Generate Study Plans</strong> - Create personalized study schedules</li>
                            <li style="margin-bottom: 10px;">❓ <strong>Quiz Generator</strong> - Test your knowledge with AI-generated quizzes</li>
                            <li style="margin-bottom: 10px;">📝 <strong>Summarizer</strong> - Quickly summarize long documents</li>
                            <li style="margin-bottom: 10px;">💡 <strong>Study Tips</strong> - Get personalized study recommendations</li>
                        </ul>
                        
                        <div style="text-align: center; margin: 30px 0;">
                            <a href="http://127.0.0.1:5000" style="display: inline-block; background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #1f2937; padding: 12px 30px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">
                                Go to Dashboard
                            </a>
                        </div>
                        
                        <hr style="border: none; border-top: 1px solid #2d3748; margin: 30px 0;">
                        
                        <p style="color: #9ca3af; font-size: 12px; margin: 0; text-align: center;">
                            Happy studying! 🚀
                        </p>
                    </div>
                </body>
            </html>
            """
        )
        
        mail.send(msg)
        return True
    except Exception as e:
        print(f"Error sending welcome email: {str(e)}")
        return False
