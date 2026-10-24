<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import {
  CircleCheck,
  LoaderCircle,
  PenLine,
  RefreshCw,
  ScanBarcode,
  TriangleAlert,
} from "@lucide/vue";
import type { CameraDevice, Html5Qrcode } from "html5-qrcode";
import type { BarcodeCheckProduct, BarcodeCheckResponse } from "~~/types";

interface Props {
  modelValue: boolean;
  /** Action label after verification finds no product (e.g. "Buka Form Produk"). */
  notFoundActionLabel?: string;
  /** Action label after a product is verified (default: "Gunakan Produk"). */
  foundActionLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  notFoundActionLabel: "",
  foundActionLabel: "Gunakan Produk",
});

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  /** Verification succeeded and the barcode belongs to a product. */
  found: [product: BarcodeCheckProduct];
  /** User acknowledged that verification found no product for the barcode. */
  notFound: [barcode: string];
}>();

/**
 * Scan state and verification state are deliberately separate (§5 PROMT.md):
 * - "scanned"  = the library decoded a code successfully (camera read only).
 * - "verified*" = the server confirmed or rejected the product lookup.
 * A successful scan never implies a registered product, and a failed
 * verification is never treated as "product does not exist".
 */
type Phase =
  | "idle"
  | "starting"
  | "scanning"
  | "scanned"
  | "verifying"
  | "verified-found"
  | "verified-missing"
  | "failed";

/** Where the current barcode value came from (manual input is never "scanned"). */
type ScanOrigin = "scan" | "manual";

const VIEWPORT_ID = "barcode-scanner-viewport";

const phase = ref<Phase>("idle");
const barcodeValue = ref("");
const scanOrigin = ref<ScanOrigin>("scan");
const verifiedProduct = ref<BarcodeCheckProduct | null>(null);
const verifyError = ref("");
const cameraError = ref("");
const cameras = ref<CameraDevice[]>([]);
const selectedCameraId = ref("");

const hasCameraChoice = computed(() => cameras.value.length > 1);

const cameraOptions = computed(() =>
  cameras.value.map((camera) => ({
    value: camera.id,
    label: camera.label || `Kamera ${camera.id}`,
  })),
);

const canVerify = computed(
  () => barcodeValue.value.trim().length > 0 && phase.value !== "verifying",
);

type ScannerModule = typeof import("html5-qrcode");

// The library touches browser APIs, so it is only ever imported on the client
// and only after the modal opens (SSR safety).
let scannerModule: ScannerModule | null = null;
let scanner: Html5Qrcode | null = null;
/** Bumped on every open/close so late async results never touch a closed modal. */
let session = 0;
/** Guards the success callback against duplicate reads of the same code. */
let isProcessingScan = false;

const close = (): void => {
  emit("update:modelValue", false);
};

const handleNotFoundAction = (): void => {
  emit("notFound", barcodeValue.value.trim());
};

const resetScanState = (): void => {
  phase.value = "idle";
  barcodeValue.value = "";
  scanOrigin.value = "scan";
  verifiedProduct.value = null;
  verifyError.value = "";
  cameraError.value = "";
  isProcessingScan = false;
};

/** Human-readable message for every camera failure listed in §8 PROMT.md. */
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
  return preferred?.id ?? devices[0]?.id ?? "";
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

/**
 * Success callback: record the decoded code and stop the camera. NO API call
 * happens here — verification is an explicit user action (§5C PROMT.md).
 */
const handleDecoded = (decodedText: string): void => {
  if (isProcessingScan || phase.value !== "scanning") return;

  const barcode = decodedText.trim();
  if (!barcode) return;

  isProcessingScan = true;
  barcodeValue.value = barcode;
  scanOrigin.value = "scan";
  verifiedProduct.value = null;
  verifyError.value = "";
  void stopCamera().then(() => {
    phase.value = "scanned";
  });
};

const startScanning = async (): Promise<void> => {
  if (!import.meta.client) return;

  const currentSession = session;
  phase.value = "starting";
  cameraError.value = "";
  barcodeValue.value = "";
  scanOrigin.value = "scan";
  verifiedProduct.value = null;
  verifyError.value = "";
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
    cameraError.value = mapCameraError(error);
  }
};

/** "Scan Ulang": drop every previous result and restart the camera. */
const rescan = (): void => {
  void startScanning();
};

/**
 * Manual edit invalidates any previous verification result so stale product
 * info is never kept for a changed code (§5D PROMT.md).
 */
const handleBarcodeInput = (value: string): void => {
  barcodeValue.value = value;
  scanOrigin.value = "manual";
  verifiedProduct.value = null;
  verifyError.value = "";
  if (phase.value !== "scanning") phase.value = "scanned";
};

const verifyBarcode = async (): Promise<void> => {
  const barcode = barcodeValue.value.trim();
  if (!barcode || phase.value === "verifying") return;

  const currentSession = session;
  phase.value = "verifying";
  verifyError.value = "";
  verifiedProduct.value = null;

  try {
    const response = await $fetch<BarcodeCheckResponse>(
      `/api/products/barcode/${encodeURIComponent(barcode)}`,
    );
    if (currentSession !== session) return;

    if (response.exists && response.data) {
      verifiedProduct.value = response.data;
      phase.value = "verified-found";
      emit("found", response.data);
      return;
    }

    phase.value = "verified-missing";
  } catch {
    if (currentSession !== session) return;
    // A failed request is never treated as "product does not exist" (§5C).
    phase.value = "failed";
    verifyError.value =
      "Gagal memeriksa barcode ke server. Periksa koneksi lalu coba lagi.";
  }
};

const handleCameraChange = (value: string | number): void => {
  const cameraId = String(value);
  if (!cameraId || cameraId === selectedCameraId.value) return;

  selectedCameraId.value = cameraId;

  // Only restart a running stream; an idle scanner picks the id up on start.
  if (phase.value === "scanning") void startScanning();
};

const showViewport = computed(() =>
  ["idle", "starting", "scanning", "failed"].includes(phase.value),
);

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
    description="Arahkan kamera ke barcode produk, lalu verifikasi barcode."
    max-w-xl
    @update:model-value="close"
  >
    <div class="space-y-4 p-6">
      <!-- Camera viewport -->
      <div
        v-if="showViewport"
        class="relative min-h-[240px] overflow-hidden rounded-3xl border border-line/70 bg-night [&_video]:aspect-video [&_video]:w-full [&_video]:object-cover"
      >
        <div :id="VIEWPORT_ID" class="min-h-[240px] w-full" />

        <!-- Idle / starting overlay -->
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
              v-if="phase === 'starting'"
              class="flex items-center justify-center gap-2 text-sm text-white/80"
            >
              <LoaderCircle class="h-4 w-4 animate-spin" />
              Menyalakan kamera…
            </p>

            <p v-else class="text-sm text-white/80">
              {{ cameraError || "Kamera tidak aktif." }}
            </p>

            <BaseButton
              v-if="phase === 'idle' || phase === 'failed'"
              variant="secondary"
              @click="startScanning"
            >
              {{ cameraError ? "Coba Lagi" : "Mulai Pindai" }}
            </BaseButton>
          </div>
        </div>

        <!-- Scanning frame + waiting indicator -->
        <div
          v-else
          class="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <div
            class="h-36 w-56 rounded-2xl border-2 border-mint/80 shadow-[0_0_0_9999px_rgba(15,23,42,0.55)]"
          />
          <span
            class="absolute bottom-4 inline-flex items-center gap-2 rounded-full bg-night/80 px-3 py-1.5 text-xs font-semibold text-white/85"
          >
            <span class="h-2 w-2 animate-pulse rounded-full bg-mint" />
            Menunggu barcode…
          </span>
        </div>
      </div>

      <p v-if="phase === 'scanning'" class="text-center text-sm text-muted">
        Arahkan kamera ke barcode produk. Mendukung EAN-13, EAN-8, UPC-A,
        UPC-E, dan Code 128.
      </p>

      <!-- Camera choice when the device exposes more than one camera -->
      <BaseSelect
        v-if="hasCameraChoice && showViewport"
        label="Kamera"
        :model-value="selectedCameraId"
        :options="cameraOptions"
        @update:model-value="handleCameraChange"
      />

      <!-- Scan result: successfully decoded (camera read only, not verified) -->
      <div
        v-if="phase === 'scanned' || phase === 'verifying'"
        class="rounded-2xl border border-brand/40 bg-brand-soft p-4"
      >
        <div class="flex items-center gap-3">
          <CircleCheck class="h-6 w-6 shrink-0 text-brand" />
          <div>
            <p class="text-sm font-semibold text-brand">
              Barcode berhasil dipindai
            </p>
            <p class="text-xs text-muted">
              Barcode belum diverifikasi ke database. Tekan Verifikasi Barcode.
            </p>
          </div>
        </div>

        <div class="mt-3">
          <BaseInput
            :model-value="barcodeValue"
            label="Barcode"
            inputmode="numeric"
            :disabled="phase === 'verifying'"
            @update:model-value="handleBarcodeInput"
          />
        </div>

        <p
          v-if="scanOrigin === 'manual'"
          class="mt-2 flex items-center gap-1.5 text-xs font-medium text-amber"
        >
          <PenLine class="h-3.5 w-3.5" />
          Barcode dimasukkan manual (bukan hasil pemindaian).
        </p>

        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton :loading="phase === 'verifying'" :disabled="!canVerify" @click="verifyBarcode">
            Verifikasi Barcode
          </BaseButton>
          <BaseButton variant="secondary" :disabled="phase === 'verifying'" @click="rescan">
            <RefreshCw class="h-4 w-4" />
            Scan Ulang
          </BaseButton>
        </div>
      </div>

      <!-- Verification result: product found -->
      <div
        v-else-if="phase === 'verified-found' && verifiedProduct"
        class="rounded-2xl border border-brand/40 bg-brand-soft p-4"
      >
        <div class="flex items-center gap-3">
          <CircleCheck class="h-6 w-6 shrink-0 text-brand" />
          <div>
            <p class="text-sm font-semibold text-brand">Produk ditemukan</p>
            <p class="font-mono text-xs text-muted">
              {{ verifiedProduct.barcode }}
            </p>
          </div>
        </div>

        <dl class="mt-3 grid gap-x-4 gap-y-1.5 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs text-muted">Produk</dt>
            <dd class="font-semibold text-ink">{{ verifiedProduct.name }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">SKU</dt>
            <dd class="font-mono text-ink-2">{{ verifiedProduct.sku }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Kategori</dt>
            <dd class="text-ink-2">{{ verifiedProduct.categoryName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Merek</dt>
            <dd class="text-ink-2">{{ verifiedProduct.brandName ?? "—" }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Satuan</dt>
            <dd class="text-ink-2">{{ verifiedProduct.unitName }}</dd>
          </div>
          <div>
            <dt class="text-xs text-muted">Stok saat ini</dt>
            <dd class="font-semibold text-ink">
              {{ verifiedProduct.stock }} {{ verifiedProduct.unitSymbol }}
            </dd>
          </div>
        </dl>

        <p
          v-if="!verifiedProduct.isActive"
          class="mt-3 flex items-center gap-1.5 text-xs font-medium text-amber"
        >
          <TriangleAlert class="h-3.5 w-3.5" />
          Produk berstatus nonaktif.
        </p>

        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton @click="close">{{ props.foundActionLabel }}</BaseButton>
          <BaseButton variant="secondary" @click="rescan">
            <RefreshCw class="h-4 w-4" />
            Scan Ulang
          </BaseButton>
        </div>
      </div>

      <!-- Verification result: no product for this barcode -->
      <div
        v-else-if="phase === 'verified-missing'"
        class="rounded-2xl border border-amber/40 bg-amber-soft p-4"
      >
        <div class="flex items-center gap-3">
          <TriangleAlert class="h-6 w-6 shrink-0 text-amber" />
          <div>
            <p class="text-sm font-semibold text-amber">
              Produk tidak ditemukan
            </p>
            <p class="text-xs text-muted">
              Barcode
              <span class="font-mono text-ink-2">{{ barcodeValue }}</span>
              belum terdaftar sebagai produk.
            </p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton v-if="props.notFoundActionLabel" @click="handleNotFoundAction">
            {{ props.notFoundActionLabel }}
          </BaseButton>
          <BaseButton
            :variant="props.notFoundActionLabel ? 'secondary' : 'primary'"
            @click="rescan"
          >
            <RefreshCw class="h-4 w-4" />
            Scan Ulang
          </BaseButton>
        </div>
      </div>

      <!-- Verification failed (transport/HTTP error — NOT a missing product) -->
      <div
        v-else-if="phase === 'failed' && verifyError"
        class="rounded-2xl border border-coral/40 bg-coral-soft p-4"
      >
        <div class="flex items-center gap-3">
          <TriangleAlert class="h-6 w-6 shrink-0 text-coral" />
          <div>
            <p class="text-sm font-semibold text-coral">
              Gagal memverifikasi barcode
            </p>
            <p class="text-xs text-muted">{{ verifyError }}</p>
          </div>
        </div>

        <div class="mt-4 flex flex-wrap gap-3">
          <BaseButton @click="verifyBarcode">Coba Lagi</BaseButton>
          <BaseButton variant="secondary" @click="rescan">
            <RefreshCw class="h-4 w-4" />
            Scan Ulang
          </BaseButton>
        </div>
      </div>

      <!-- Footer -->
      <div class="flex justify-end border-t border-line/70 pt-4">
        <BaseButton variant="secondary" @click="close">Tutup</BaseButton>
      </div>
    </div>
  </BaseModal>
</template>
