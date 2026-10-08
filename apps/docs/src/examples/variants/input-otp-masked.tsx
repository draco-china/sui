"use client";

import type { ExampleProps } from "../types";
import InputOTPExample from "./input-otp-demo";

export default function Example(props: ExampleProps) {
  return <InputOTPExample {...props} mask />;
}
