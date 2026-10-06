'use client';

import React, { useState } from 'react';

const SAMPLE_ANNOUNCEMENTS = [
  {
    title: 'System Maintenance — 10 Sep, 11PM–1AM',
    body: 'The portal will be briefly unavailable for scheduled maintenance.',
    dates: 'Published 2026-09-08 · Expires 2026-09-11',
    status: 'LIVE',
  },
  {
    title: 'New Commission Rate Table Effective 1 Sep',
    body: 'Level 2 override increased to 10%. See Passbook for details.',
    dates: 'Published 2026-09-01 · Expires 2026-09-30',
    status: 'LIVE',
  },
];

const AdminAnnouncementsPage: React.FC = () => {
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [publishDate, setPublishDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  return (
    <div className="p-8">
      <h1 className="text-[19px] font-bold mb-6">Announcements &amp; Broadcast</h1>

      <div className="grid grid-cols-[1fr_1.3fr] gap-5">
        <div className="card p-6.5 h-fit">
          <h3 className="text-[15.5px] font-bold mb-1">Compose Broadcast</h3>
          <p className="text-xs text-ink-soft mb-5 leading-relaxed">
            Published announcements will appear to every member on their Dashboard until the expiry date.
          </p>

          <div className="flex flex-col gap-3.5">
            <div>
              <label className="text-xs font-bold text-ink-soft block mb-1.5">Title</label>
              <input value={title} onChange={(e) => setTitle(e.target.value)} className="input text-[13px]" />
            </div>
            <div>
              <label className="text-xs font-bold text-ink-soft block mb-1.5">Message</label>
              <textarea rows={5} value={message} onChange={(e) => setMessage(e.target.value)} className="input text-[13px] resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-ink-soft block mb-1.5">Publish Date</label>
                <input type="date" value={publishDate} onChange={(e) => setPublishDate(e.target.value)} className="input text-[12.5px] font-mono" />
              </div>
              <div>
                <label className="text-xs font-bold text-ink-soft block mb-1.5">Expiry Date</label>
                <input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} className="input text-[12.5px] font-mono" />
              </div>
            </div>
          </div>

          <button disabled className="w-full btn-primary py-3.5 text-sm mt-5.5 opacity-60 cursor-not-allowed">
            Publish to All Members
          </button>
          <div className="mt-3 text-[11px] text-ink-faint leading-relaxed">
            The <code>announcements</code> table exists in the schema, but there's no backend module wired up
            yet — this form can't publish for real until that's built.
          </div>
        </div>

        <div className="card p-6">
          <h3 className="text-[15.5px] font-bold mb-4">Published Announcements</h3>
          <div className="flex flex-col gap-3">
            {SAMPLE_ANNOUNCEMENTS.map((a) => (
              <div key={a.title} className="p-4 border border-line rounded-xl">
                <div className="flex justify-between items-start gap-2.5">
                  <div className="text-[13.5px] font-bold">{a.title}</div>
                  <span className="badge-green shrink-0">{a.status}</span>
                </div>
                <div className="text-xs text-ink-soft leading-relaxed mt-1.5">{a.body}</div>
                <div className="text-[11px] text-ink-faint mt-2">{a.dates}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAnnouncementsPage;
