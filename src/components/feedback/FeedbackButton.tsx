"use client";

import { useState } from "react";
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Send } from "lucide-react";

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="w-full justify-start">
          Give Feedback
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Send Feedback</DialogTitle>
        </DialogHeader>
        <form
          action="https://formsubmit.co/nuviatechltd@gmail.com"
          method="POST"
          className="space-y-4"
        >
          {/* Prevent spam */}
          <input type="hidden" name="_captcha" value="false" />
          <input type="hidden" name="_template" value="table" />

          <Input
            type="text"
            name="name"
            placeholder="Your Name"
            required
          />
          <Input
            type="email"
            name="email"
            placeholder="Your Email"
            required
          />
          <Textarea
            name="message"
            placeholder="Write your feedback..."
            rows={4}
            required
          />

          <DialogFooter>
            <Button type="submit" variant="default">
              <Send className="h-4 w-4 mr-2" />
              Submit
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
