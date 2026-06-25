'use client'

import type { ComponentType } from 'react'
import type { AppPreset } from '@/store/use-app-store'
import { AllenSprite } from './allen-sprite'
import { CyberpunkMascot, MinecraftMascot, StrangerThingsMascot, ArcaneMascot } from './theme-mascots'

type SpriteProps = { width?: number; height?: number }

export type MascotPresetEntry = {
  Sprite: ComponentType<SpriteProps>
  /** Shown under the mascot in the sidebar card */
  sidebarCaption: string
  /** Shown in the Overview top banner */
  bannerTitle: string
  bannerSubtitle: string
}

// Hand-illustrated mascots, keyed by preset. Presets not listed here
// ('butcher', 'neutral') render their own dedicated UI.
export const MASCOT_PRESETS: Partial<Record<AppPreset, MascotPresetEntry>> = {
  allen: {
    Sprite: AllenSprite,
    sidebarCaption: 'Allen · your alien study buddy',
    bannerTitle: 'Hey, good to see you!',
    bannerSubtitle: 'Allen says your grades are synced and ready to go.',
  },
  cyberpunk: {
    Sprite: CyberpunkMascot,
    sidebarCaption: 'Nyx · running point for you',
    bannerTitle: 'Systems online.',
    bannerSubtitle: 'Nyx has your grades synced and ready to go.',
  },
  minecraft: {
    Sprite: MinecraftMascot,
    sidebarCaption: 'Cube · mining your grades',
    bannerTitle: 'New chunk loaded: Overview.',
    bannerSubtitle: 'Cube dug up your latest grades — all synced.',
  },
  'stranger-things': {
    Sprite: StrangerThingsMascot,
    sidebarCaption: 'Wren · lighting the way',
    bannerTitle: "Friends don't lie.",
    bannerSubtitle: 'Wren scouted ahead — grades are synced and up to date.',
  },
  arcane: {
    Sprite: ArcaneMascot,
    sidebarCaption: 'Volt · powering your sidebar',
    bannerTitle: 'Fully charged.',
    bannerSubtitle: 'Volt rewired things — your grades are synced.',
  },
}
