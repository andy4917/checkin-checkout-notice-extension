type ClipboardWriter = {
  writeText(text: string): Promise<void>;
};

export function copyToClipboard(
  text: string,
  button: Pick<HTMLButtonElement, "innerText">,
  clipboard: ClipboardWriter = navigator.clipboard,
): Promise<void> {
  return clipboard.writeText(text).then(() => {
    const oldLabel = button.innerText;
    button.innerText = "OK";
    setTimeout(() => {
      button.innerText = oldLabel;
    }, 1000);
  });
}
