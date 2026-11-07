"use client";

import { Button, type ButtonProps } from "@heroui/react";
import Link from "next/link";

/** A HeroUI Button, ripple included, that is still a link: react-aria gives any element that is not a button role="button". */
export function LinkButton({ href, ...props }: Omit<ButtonProps, "as" | "href"> & { href: string }) {
  return <Button as={Link} href={href} role="link" {...props} />;
}
