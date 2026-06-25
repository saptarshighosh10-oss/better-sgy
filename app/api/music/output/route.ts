import { execFile } from 'child_process'
import { promisify } from 'util'
import { NextResponse } from 'next/server'

export const runtime = 'nodejs'

const run = promisify(execFile)

type AudioItem = {
  _name?: string
  coreaudio_default_audio_output_device?: string
  coreaudio_device_transport?: string
}

type OutputInfo = {
  deviceName: string | null
  kind: 'bluetooth' | 'builtin' | 'wired' | 'airplay' | 'virtual' | 'other'
  isBluetooth: boolean
}

const TRANSPORT_KIND: Record<string, OutputInfo['kind']> = {
  bluetooth:   'bluetooth',
  bluetoothle: 'bluetooth',
  builtin:     'builtin',
  usb:         'wired',
  hdmi:        'wired',
  displayport: 'wired',
  pci:         'wired',
  thunderbolt: 'wired',
  airplay:     'airplay',
  virtual:     'virtual',
  aggregate:   'virtual',
}

function classify(transport: string | undefined): OutputInfo['kind'] {
  if (!transport) return 'other'
  const m = transport.match(/coreaudio_device_type_(\w+)/)
  const key = m?.[1]?.toLowerCase()
  return (key && TRANSPORT_KIND[key]) || 'other'
}

export async function GET() {
  try {
    const { stdout } = await run('system_profiler', ['SPAudioDataType', '-json'], { timeout: 4000 })
    const data = JSON.parse(stdout)
    const items: AudioItem[] = data?.SPAudioDataType?.[0]?._items ?? []
    const active = items.find(it => it.coreaudio_default_audio_output_device === 'spaudio_yes')

    if (!active) {
      return NextResponse.json<OutputInfo>({ deviceName: null, kind: 'other', isBluetooth: false })
    }

    const kind = classify(active.coreaudio_device_transport)
    return NextResponse.json<OutputInfo>({
      deviceName: active._name ?? null,
      kind,
      isBluetooth: kind === 'bluetooth',
    })
  } catch {
    return NextResponse.json<OutputInfo>({ deviceName: null, kind: 'other', isBluetooth: false })
  }
}
