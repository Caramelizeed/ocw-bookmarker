export {};

chrome.runtime.onMessage.addListener(
    (
        message,
        _sender,
        sendResponse
    ) => {

        if (
            message?.type !== "DOWNLOAD_RESOURCE"
        ) {
            return;
        }

        const url =
            typeof message.url === "string"
                ? message.url
                : null;

        const filename =
            typeof message.filename === "string"
                ? message.filename
                : "OCW-resource.pdf";

        if (!url) {
            sendResponse({
                ok: false,
                reason: "INVALID_URL"
            });

            return;
        }

        void chrome.downloads.download({

            url,

            filename:
                `OCW Bookmarker/${filename}`,

            saveAs:
                false,

            conflictAction:
                "uniquify"

        }).then(
            downloadId => {

                console.log(
                    "[OCW Bookmarker] Download started:",
                    downloadId,
                    filename
                );

                sendResponse({
                    ok: true,
                    downloadId
                });

            },
            error => {

                console.error(
                    "[OCW Bookmarker] Download failed:",
                    error
                );

                sendResponse({
                    ok: false,
                    reason: String(error)
                });

            }
        );

        return true;
    }
);
