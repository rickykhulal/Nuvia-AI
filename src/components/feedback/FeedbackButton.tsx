"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "../ui/dialog"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { Input } from "../ui/input"
import { useSidebar } from "../ui/sidebar"

export default function FeedbackButton({ minimal = false }: { minimal?: boolean }) {
  const [open, setOpen] = useState(false)
  const [feedback, setFeedback] = useState("")
  const [email, setEmail] = useState("")

  const { state } = useSidebar()

  const handleSubmit = () => {
    // In a real app, you'd send the feedback somewhere (Firebase, database, etc.)
    console.log("Feedback submitted:", { email, feedback })
    alert("Thank you for your feedback!")
    setOpen(false)
    setEmail("")
    setFeedback("")
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        className="w-full"
        onClick={() => setOpen(true)}
      >
        {minimal || state === "collapsed" ? "📝" : "Give Feedback"}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>We'd love your feedback!</DialogTitle>
          </DialogHeader>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              handleSubmit()
            }}
            className="space-y-4"
          >
            <Input
              type="email"
              placeholder="Your email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Textarea
              placeholder="Your feedback..."
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              required
            />
            <Button type="submit" className="w-full">
              Submit
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </>
  )
}
