import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { InviteUserEmail } from '@/components/emails';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req) {
  try {
    const { emails, invitedByUsername, invitedByEmail, boardName, inviteLink } = await req.json();

    if (!emails || !invitedByUsername || !invitedByEmail || !boardName || !inviteLink) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    const data = await resend.emails.send({
      from: 'Smart Bulletin Board <onboarding@resend.dev>',
      to: Array.isArray(emails) ? emails : [emails],
      subject: `Join ${boardName} on Smart Bulletin Board`,
      react: InviteUserEmail({
        invitedByUsername: invitedByUsername,
        invitedByEmail: invitedByEmail,
        boardName: boardName,
        inviteLink: inviteLink
      })
    });

    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error sending email:', error);
    return NextResponse.json(
      { error: 'Failed to send invitation' },
      { status: 500 }
    );
  }
}