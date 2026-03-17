"use client";

import { MouseEvent } from "react";

type Props = {
  href: string;
  courseId: string;
  materialId: string;
  children: React.ReactNode;
};

export default function TrackedMaterialLink({
  href,
  courseId,
  materialId,
  children,
}: Props) {
  function handleClick(_e: MouseEvent<HTMLAnchorElement>) {
    void fetch("/api/activity-log", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        actionType: "OPEN_MATERIAL",
        courseId,
        targetId: materialId,
      }),
    });
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      className="mt-2 inline-block underline"
    >
      {children}
    </a>
  );
}