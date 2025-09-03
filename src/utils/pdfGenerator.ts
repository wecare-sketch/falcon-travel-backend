type PdfOptions = {
  format?: "A4" | "Letter" | "Legal";
  landscape?: boolean;
  margin?: { top?: string; bottom?: string; left?: string; right?: string };
};

export async function htmlToPdfBuffer(
  html: string,
  options: PdfOptions = {}
): Promise<Buffer> {
  const {
    format = "A4",
    landscape = false,
    margin = { top: "24px", right: "24px", bottom: "24px", left: "24px" },
  } = options;

  const isServerless = !!process.env.VERCEL;

  const chromium = await import("@sparticuz/chromium");
  const puppeteerMod = isServerless
    ? await import("puppeteer-core")
    : await import("puppeteer");

  const puppeteer = (puppeteerMod as any).default;

  const launchOptions: any = isServerless
    ? {
        args: (chromium as any).args,
        defaultViewport: (chromium as any).defaultViewport,
        executablePath: await (chromium as any).executablePath(),
        headless: (chromium as any).headless,
      }
    : {
        headless: "new",
        args: ["--no-sandbox", "--disable-setuid-sandbox"],
        // executablePath: optional; puppeteer (full) downloads Chromium for you locally
      };

  const browser = await puppeteer.launch(launchOptions);

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdf = await page.pdf({
      format,
      landscape,
      printBackground: true,
      margin,
      preferCSSPageSize: false,
    });

    await page.close();
    return pdf as Buffer;
  } finally {
    await browser.close();
  }
}
