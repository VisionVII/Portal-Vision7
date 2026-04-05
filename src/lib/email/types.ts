export type EmailTemplateType =
  | 'login_otp'
  | 'security_alert'
  | 'welcome'
  | 'invite'
  | 'newsletter_welcome'
  | 'newsletter_digest'
  | 'password_reset'
  | 'role_change'
  | 'account_deactivated';

export interface EmailTemplateData {
  login_otp: {
    code: string;
    userName?: string;
    expiresInMinutes: number;
    ipAddress?: string;
    userAgent?: string;
  };
  security_alert: {
    alertType: 'new_login' | 'failed_attempts' | 'role_changed' | 'password_changed';
    userName?: string;
    details: string;
    ipAddress?: string;
    timestamp: string;
  };
  welcome: {
    userName: string;
    role?: string;
    dashboardUrl: string;
  };
  invite: {
    inviterName?: string;
    role: string;
    activationUrl: string;
    expiresAt: string;
  };
  newsletter_welcome: {
    subscriberEmail: string;
    unsubscribeUrl: string;
  };
  newsletter_digest: {
    posts: Array<{ title: string; excerpt: string; url: string; imageUrl?: string }>;
    unsubscribeUrl: string;
  };
  password_reset: {
    resetUrl: string;
    expiresInMinutes: number;
    userName?: string;
  };
  role_change: {
    userName: string;
    oldRole: string;
    newRole: string;
    changedBy: string;
  };
  account_deactivated: {
    userName: string;
    reason?: string;
    contactEmail: string;
  };
}

export interface EmailPayload<T extends EmailTemplateType = EmailTemplateType> {
  to: string;
  template: T;
  data: EmailTemplateData[T];
  subject?: string;
}

export interface SecurityCode {
  code: string;
  email: string;
  type: 'login' | 'password_reset' | 'email_verification';
  expiresAt: Date;
  createdAt: Date;
}
