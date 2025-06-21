'use client';

import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { toast } from '@/components/ui/use-toast';

export default function FeedbackClientWrapper() {
  const [show, setShow] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (!name || !email || !message) {
      toast({ title: "All fields required", description: "Please fill in all fields.", variant: "destructive" });
      return;
    }

    const form = document.createElement("form");
    form.method = "POST";
    form.action = "https://formsubmit.co/nuviatechltd@gmail.com"; // 🔁 Replace with your email

    [ ['name', name], ['email', email], ['message', message] ].forEach(([n, v]) => {
      const input = document.createElement("input");
      input.type = "hidden";
      input.name = n as string;
      input.value = v as string;
      form.appendChild(input);
    });

    document.body.appendChild(form);
    form.submit();
  };

  return (
    <>
      {/* Feedback Button */}
      <div className="fixed bottom-5 left-5 z-50">
        <Button
          onClick={() => setShow(true)}
          variant="outline"
          className="shadow-md"
        >
          💬 Feedback
        </Button>
      </div>

      {/* Modal */}
      {show && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center">
          <div className="bg-white dark:bg-zinc-900 rounded-lg p-6 w-full max-w-md shadow-lg space-y-4">
            <h2 className="text-xl font-bold text-foreground">Send Feedback</h2>
            <Input placeholder="Your Name" value={name} onChange={(e) => setName(e.target.value)} />
            <Input placeholder="Your Email" value={email} onChange={(e) => setEmail(e.target.value)} />
            <Textarea placeholder="Your Message" value={message} onChange={(e) => setMessage(e.target.value)} />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setShow(false)}>Cancel</Button>
              <Button onClick={handleSubmit}>Send</Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
