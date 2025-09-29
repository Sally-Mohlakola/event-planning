import { vi } from 'vitest';

export const mockSave = vi.fn();
export const mockText = vi.fn();
export const mockSetFontSize = vi.fn();
export const mockAddImage = vi.fn();
export const mockAutoTable = vi.fn();

// Create a mock instance that jsPDF will return
const createMockInstance = () => ({
  setFontSize: mockSetFontSize,
  text: mockText,
  save: mockSave,
  addImage: mockAddImage,
  autoTable: mockAutoTable,
  internal: {
    pageSize: {
      width: 210,
      height: 297
    }
  },
  // Add any other methods your component uses
  setTextColor: vi.fn(),
  setDrawColor: vi.fn(),
  setFillColor: vi.fn(),
  rect: vi.fn(),
  line: vi.fn(),
  addPage: vi.fn(),
  setFont: vi.fn(),
  getFontSize: vi.fn(() => 12),
  getTextWidth: vi.fn(() => 50),
});

export const jsPDF = vi.fn(() => createMockInstance());

export default { jsPDF };