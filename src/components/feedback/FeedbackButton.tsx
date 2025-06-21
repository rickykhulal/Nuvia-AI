"use client";

import { useState } from "react";
import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

// Optional: Replace this with your real modal/form logic
export default function FeedbackButton() {
  const [clicked, setClicked] = useState(false);

  const handleClick = () => {
    // You can replace this with a modal, Google Form, or redirect
    window.open("https://forms.gle/your-google-form-url", "_blank"); // example
    setClicked(true);
  };

  return (
    <Button
      onClick={handleClick}
      variant="ghost"
      className="w-full justify-start text-left"
    >
      <MessageCircle className="h-4 w-4 mr-2" />
      {clicked ? "Thanks!" : "Feedback"}
    </Button>
  );
}
