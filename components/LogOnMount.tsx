"use client";

import { useEffect } from "react";

type Props = {
  actionType:
    | "VIEW_DASHBOARD"
    | "START_QUIZ"
    | "OPEN_MATERIAL"
    | "SUBMIT_QUIZ"
    | "ANSWER_QUESTION"
    | "LOGIN";
  courseId?: string;
  targetId?: string;
  durationSeconds?: number;
};

export default function LogOnMount({
  actionType,
  courseId,
  targetId,
  durationSeconds,
}: Props) {
  useEffect(() => {
    void fetch("/api/activity-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actionType,
        courseId,
        targetId,
        durationSeconds,
      }),
    });
  }, [actionType, courseId, targetId, durationSeconds]);

  return null;
}