import React from "react";
import { Profile } from "./Profile";
import { Stage } from "./Stage";

export function Game() {
  return (
    <div className="min-h-full w-full flex flex-col bg-paper">
      <Profile />
      <div className="flex-1 flex items-start justify-center px-6 py-12">
        <Stage />
      </div>
    </div>
  );
}
