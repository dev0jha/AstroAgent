import React from "react";

export const StreamingIndicator: React.FC = () => {
  return (
    <span className="inline-block w-1.5 h-4 ml-1 bg-primary rounded-sm animate-pulse align-middle" style={{ animationDuration: "0.8s" }} />
  );
};
