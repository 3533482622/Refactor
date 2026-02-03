"use client";

import type { ComponentProps } from "react";
import { memo } from "react";
import { code } from "@streamdown/code";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, ...props }: ResponseProps) => (
    <Streamdown
      className={className}
      plugins={{ code }}
      shikiTheme={["github-light", "github-light"]}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
