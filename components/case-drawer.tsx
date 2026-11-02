"use client";

import { Drawer, DrawerBody, DrawerContent, DrawerHeader } from "@heroui/drawer";
import { TypeCase } from "./type-case";

type Props = {
  selected: string[];
  onToggle: (key: string) => void;
  onClear: () => void;
  onClose: () => void;
};

/** M-25. The type case as a bottom sheet on a phone; loaded only when someone opens it. */
export function CaseDrawer({ selected, onToggle, onClear, onClose }: Props) {
  return (
    <Drawer isOpen placement="bottom" onClose={onClose} motionProps={{ transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } }}>
      <DrawerContent>
        <DrawerHeader>類別字盤</DrawerHeader>
        <DrawerBody className="case-drawer">
          <TypeCase selected={selected} onToggle={onToggle} onClear={onClear} />
        </DrawerBody>
      </DrawerContent>
    </Drawer>
  );
}
