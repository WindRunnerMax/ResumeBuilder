export const CDP_EXPORT_PDF = "CDP_EXPORT_PDF";

export type CdpExportPdfRequest = {
  type: typeof CDP_EXPORT_PDF;
  payload: {
    // CDP Page.printToPDF options
    // https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-printToPDF
    options?: {
      paperWidth?: number;
      paperHeight?: number;
      marginTop?: number;
      marginBottom?: number;
      marginLeft?: number;
      marginRight?: number;
      printBackground?: boolean;
      preferCSSPageSize?: boolean;
      scale?: number;
    };
    // download file name
    filename?: string;
  };
};

export type RequestType = CdpExportPdfRequest;

export type CdpExportPdfResponse = {
  type: typeof CDP_EXPORT_PDF;
  payload:
    | { success: true }
    | { success: false; error: string };
};

export type ResponseType = CdpExportPdfResponse;
