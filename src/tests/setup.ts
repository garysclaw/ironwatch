import "@testing-library/jest-dom";

// Mock Tauri APIs for test environment
vi.mock("@tauri-apps/api/event", () => ({
  listen: vi.fn().mockResolvedValue(() => {}),
  emit: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@tauri-apps/api/core", () => ({
  invoke: vi.fn().mockResolvedValue({
    hostname: "test-host",
    os_name: "Linux",
    os_version: "6.x",
    kernel_version: "6.0",
    cpu_brand: "Test CPU",
    cpu_count: 4,
  }),
}));
