<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { LoaderCircle, RefreshCw, ScanBarcode, VideoOff } from "@lucide/vue";
import type { CameraDevice, Html5Qrcode } from "html5-qrcode";
import type { BarcodeCheckProduct, BarcodeCheckResponse } from "~~/types";

interface Props {
  modelValue: boolean;
}

const props = defineProps<Props>();

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  /** Scanned barcode already belongs to a product — parent shows a toast. */
  exists: [product: BarcodeCheckProduct];
  /** Barcode is free — parent opens the create form prefilled with it. */
  available: [barcode: string];
}>();

type Phase =
  | "idle"
  | "starting"
  | "scanning"
  | "checking"
  | "found"
  | "available"
  | "failed";

const VIEWPORT_ID = "product-barcode-scanner-viewport";

const phase = ref<Phase>("idle");
const errorMessage = ref("");
const scannedCode = ref("");
const foundProduct = ref<BarcodeCheckProduct | null>(null);
const cameras = ref<CameraDevice[]>([]);
const selectedCameraId = ref("");

const hasCameraChoice = computed(() => cameras.value.length > 1);

const cameraOptions = computed(() =>
  cameras.value.map((camera) => ({
    value: camera.id,
    label: camera.label || `Kamera ${camera.id}`,
  })),
);

type ScannerModule = typeof import("html5-qrcode");

// The library touches browser APIs, so it is only ever imported on the client
// and only after the modal opens (§6 SSR compatibility).
let scannerModule: ScannerModule | null = null;
let scanner: Html5Qrcode | null = null;
/** Bumped on every open/close so late async results never touch a closed modal. */
let session = 0;
/** Guards the success callback against duplicate reads of the same code. */
let isProcessingScan = false;

const close = (): void => {
  emit("update:modelValue", false);
};

const continueToForm = (): void => {
  emit("available", scannedCode.value);
};

const resetScanState = (): void => {
  phase.value = "idle";
  errorMessage.value = "";
  scannedCode.value = "";
  foundProduct.value = null;
  isProcessingScan = false;
};

/** Human-readable message for every camera failure listed in §8. */
const mapCameraError = (error: unknown): string => {
  if (error instanceof Error) {
    switch (error.name) {
      case "NotAllowedError":
      case "PermissionDeniedError":
        return "Izin kamera ditolak. Izinkan akses kamera di browser lalu coba lagi.";
      case "NotFoundError":
      case "OverconstrainedError":
        return "Kamera tidak tersedia di perangkat ini.";
      case "NotReadableError":
      case "TrackStartError":
        return "Kamera sedang digunakan aplikasi lain. Tutup aplikasi tersebut lalu coba lagi.";
      case "SecurityError":
        return "Kamera hanya dapat diakses melalui koneksi aman (HTTPS atau localhost).";
    }

    if (error.message === "no-camera") return "Tidak ada kamera yang terdeteksi.";
    if (error.message === "unsupported") {
      return "Browser ini tidak mendukung akses kamera. Gunakan browser terbaru.";
    }
  }

  return "Kamera gagal diinisialisasi. Silakan coba lagi.";
};

/** Prefer the rear camera on mobile, otherwise fall back to the first one. */
const pickPreferredCamera = (devices: CameraDevice[]): string => {
  const preferred = devices.find((device) =>
    /back|rear|trong|environment/i.test(device.label),
  );
  return (preferred ?? devices[0]).id;
};

const stopCamera = async (): Promise<void> => {
  if (!scanner?.isScanning) return;

  try {
    await scanner.stop();
  } catch {
    // The stream can already be released when the modal closes mid-scan.
  }
};

const disposeScanner = async (): Promise<void> => {
  await stopCamera();

  if (!scanner) return;
  try {
    scanner.clear();
  } catch {
    // Nothing to detach when the library already tore the UI down.
  }
  scanner = null;
};

const verifyBarcode = async (barcode: string): Promise<void> => {
  const currentSession = session;
  phase.value = "checking";
  scannedCode.value = barcode;

  // Release the camera while the lookup runs so the same code is not read again.
  await stopCamera();
  if (currentSession !== session) return;

  try {
    const response = await $fetch<BarcodeCheckResponse>(
      `/api/products/barcode/${encodeURIComponent(barcode)}`,
    );
    if (currentSession !== session) return;

    if (response.exists && response.data) {
      phase.value = "found";
      foundProduct.value = response.data;
      emit("exists", response.data);
      return;
    }

    phase.value = "available";
    emit("available", barcode);
  } catch {
    if (currentSession !== session) return;
    // A failed request is never treated as "barcode available" (§4).
    phase.value = "failed";
    errorMessage.value =
      "Barcode gagal diperiksa ke server. Periksa koneksi lalu coba lagi.";
  }
};

const handleDecoded = (decodedText: string): void => {
  if (isProcessingScan || phase.value !== "scanning") return;

  const barcode = decodedText.trim();
  if (!barcode) return;

  isProcessingScan = true;
  void verifyBarcode(barcode);
};

const startScanning = async (): Promise<void> => {
  if (!import.meta.client) return;

  const currentSession = session;
  phase.value = "starting";
  errorMessage.value = "";
  scannedCode.value = "";
  foundProduct.value = null;
  isProcessingScan = false;

  try {
    if (!navigator.mediaDevices?.getUserMedia) {
      throw Object.assign(new Error("unsupported"), { name: "UnsupportedError" });
    }

    scannerModule ??= await import("html5-qrcode");
    if (currentSession !== session) return;

    // The viewport lives inside the modal body, so it must be mounted first.
    await nextTick();
    if (currentSession !== session) return;
    if (!document.getElementById(VIEWPORT_ID)) {
      throw Object.assign(new Error("viewport-missing"), { name: "UiError" });
    }

    if (!scanner) {
      scanner = new scannerModule.Html5Qrcode(VIEWPORT_ID, {
        verbose: false,
        formatsToSupport: [
          scannerModule.Html5QrcodeSupportedFormats.EAN_13,
          scannerModule.Html5QrcodeSupportedFormats.EAN_8,
          scannerModule.Html5QrcodeSupportedFormats.UPC_A,
          scannerModule.Html5QrcodeSupportedFormats.UPC_E,
          scannerModule.Html5QrcodeSupportedFormats.CODE_128,
        ],
      });
    }

    if (cameras.value.length === 0) {
      const devices = await scannerModule.Html5Qrcode.getCameras();
      if (currentSession !== session) return;
      if (devices.length === 0) throw new Error("no-camera");

      cameras.value = devices;
      selectedCameraId.value = pickPreferredCamera(devices);
    }

    await scanner.start(
      selectedCameraId.value,
      { fps: 10, qrbox: { width: 240, height: 160 } },
      handleDecoded,
      () => {
        // Per-frame "nothing decoded yet" is expected while aiming the camera.
      },
    );
    if (currentSession !== session) {
      await stopCamera();
      return;
    }

    phase.value = "scanning";
  } catch (error) {
    if (currentSession !== session) return;
    phase.value = "idle";
    errorMessage.value = mapCameraError(error);
  }
};

const stopScanning = async (): Promise<void> => {
  await stopCamera();
  phase.value = "idle";
  isProcessingScan = false;
};

const handleCameraChange = (value: string | number): void => {
  const cameraId = String(value);
  if (!cameraId || cameraId === selectedCameraId.value) return;

  selectedCameraId.value = cameraId;

  // Only restart a running stream; an idle scanner picks the id up on start.
  if (phase.value === "scanning") void startScanning();
};

watch(
  () => props.modelValue,
  (open) => {
    if (!import.meta.client) return;

    if (open) {
      session += 1;
      void startScanning();
      return;
    }

    session += 1;
    void disposeScanner().then(resetScanState);
  },
  { immediate: true },
);

onBeforeUnmount(() => {
  session += 1;
  void disposeScanner();
});
</script>

<template>
  <BaseModal
    :model-value="modelValue"
    title="Scan Barcode"
    description="Arahkan barcode produk ke dalam bingkai pemindaian."
    max-w-xl
    @update:model-value="close"
  >
    <div class="space-y-4 p-6">
      <!-- Camera viewport -->
      <div
        class="relative min-h-[240px] overflow-hidden rounded-3xl border border-line/70 bg-night [&_video]:aspect-video [&_video]:w-full [&_video]:object-cover"
      >
        <div :id="VIEWPORT_ID" class="min-h-[240px] w-full" />

        <!-- Idle / starting / checking / stopped overlay -->
        <div
          v-if="phase !== 'scanning'"
          class="absolute inset-0 grid place-items-center bg-night/85 p-6 text-center"
        >
          <div class="space-y-3">
            <span
              class="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-white/10 text-mint"
            >
              <ScanBarcode class="h-5 w-5" />
            </span>

            <p
              v-if="phase === 'starting' || phase === 'checking'"
              class="flex items-center justify-center gap-2 text-sm text-white/80"
            >
              <LoaderCircle class="h-4 w-4 animate-spin" />
              {{
                phase === "starting" ? "Menyalakan kamera…" : "Memeriksa barcode…"
              }}
            </p>

            <p v-else class="text-sm text-white/80">
              {{
                phase === "idle" || phase === "failed"
                  ? errorMessage || "Kamera tidak aktif."
                  : "Kamera dimatikan."
              }}
            </p>

            <BaseButton
              v-if="phase === 'idle' || phase === 'failed'"
              variant="secondary"
              @click="startScanning"
            >
              {{ errorMessage ? "Coba Lagi" : "Mulai Pindai" }}
            </BaseButton>
          </div>
        </div>

        <!-- Scanning frame -->
        <div
          v-else
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            class="h-36 w-56 rounded-2xl border-2 border-mint/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
          />
        </div>
      </div>

      <p v-if="phase === 'scanning'" class="text-center text-sm text-muted">
        Posisikan barcode pada bingkai. Mendukung EAN-13, EAN-8, UPC-A, UPC-E,
        dan Code 128.
      </p>

      <!-- Camera choice when the device exposes more than one camera -->
      <BaseSelect
        v-if="hasCameraChoice"
        label="Kamera"
        :model-value="selectedCameraId"
        :options="cameraOptions"
        @update:model-value="handleCameraChange"
      />

      <!-- Scan result -->
      <div
        v-if="phase === 'checking' && scannedCode"
        class="flex items-center gap-3 rounded-2xl border border-line/70 bg-surface-2/60 p-4"
      >
        <LoaderCircle class="h-4 w-4 shrink-0 animate-spin text-brand" />
        <div class="min-w-0">
          <p class="text-sm font-semibold text-ink">Memeriksa barcode…</p>
          <p class="truncate font-mono text-xs text-muted">{{ scannedCode }}</p>
        </div>
      </div>

      <div
        v-else-if="phase === 'found' && foundProduct"
        class="rounded-2xl border border-brand/40 bg-brand-soft p-4"
      >
        <p class="text-sm font-semibold text-brand">Barcode sudah terdaftar.</p>
        <p class="mt-1 text-sm font-medium text-ink">{{ foundProduct.name }}</p>
        <p class="mt-0.5 font-mono text-xs text-muted">
          {{ foundProduct.barcode }}
        </p>
      </div>

      <div
        v-else-if="phase === 'available'"
        class="rounded-2xl border border-brand/40 bg-brand-soft p-4"
      >
        <p class="text-sm font-semibold text-ink">Barcode belum terdaftar.</p>
        <p class="mt-1 text-sm text-muted">
          Barcode
          <span class="font-mono text-ink-2">{{ scannedCode }}</span> akan diisi
          otomatis pada form tambah produk.
        </p>
      </div>

      <div
        v-else-if="phase === 'failed'"
        class="rounded-2xl border border-coral/40 bg-coral-soft p-4 text-sm font-medium text-coral"
      >
        {{ errorMessage }}
      </div>

      <!-- Actions -->
      <div
        class="flex flex-col-reverse gap-3 border-t border-line/70 pt-4 sm:flex-row sm:justify-end"
      >
        <BaseButton variant="secondary" @click="close">Tutup</BaseButton>

        <BaseButton v-if="phase === 'scanning'" variant="secondary" @click="stopScanning">
          <VideoOff class="h-4 w-4" />
          Hentikan Kamera
        </BaseButton>

        <BaseButton v-else-if="phase === 'found'" @click="startScanning">
          <RefreshCw class="h-4 w-4" />
          Pindai Lagi
        </BaseButton>

        <BaseButton v-else-if="phase === 'available'" @click="continueToForm">
          Buka Form Produk
        </BaseButton>

        <BaseButton v-else-if="phase === 'failed'" @click="startScanning">
          <RefreshCw class="h-4 w-4" />
          Coba Lagi
        </BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
