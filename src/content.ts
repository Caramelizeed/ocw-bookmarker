console.log("[OCW Bookmarker] Extension loaded.");

let currentVideoId: string | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;

function getVideoId(): string | null {
    const url = new URL(window.location.href);

    // Normal YouTube watch page:
    // https://www.youtube.com/watch?v=VIDEO_ID
    if (url.pathname === "/watch") {
        return url.searchParams.get("v");
    }

    // YouTube embedded player:
    // https://www.youtube.com/embed/VIDEO_ID
    if (url.pathname.startsWith("/embed/")) {
        const id = url.pathname.split("/")[2];

        if (id) {
            return id;
        }
    }

    return null;
}

function getVideo(): HTMLVideoElement | null {
    return document.querySelector("video");
}

async function saveProgress(): Promise<void> {
    const video = getVideo();
    const videoId = currentVideoId;

    if (
        !video ||
        !videoId ||
        !Number.isFinite(video.duration) ||
        video.duration <= 0
    ) {
        return;
    }

    const position = video.currentTime;

    if (!Number.isFinite(position) || position < 0) {
        return;
    }

    const progress = {
        position,
        duration: video.duration,
        updatedAt: Date.now()
    };

    await chrome.storage.local.set({
        [`video_${videoId}`]: progress
    });

    console.log(
        `[OCW Bookmarker] Saved ${position.toFixed(1)}s for ${videoId}`
    );
}

async function resumeProgress(videoId: string): Promise<void> {
    const video = getVideo();

    if (!video) {
        return;
    }

    const key = `video_${videoId}`;

    const result = await chrome.storage.local.get(key);

    const saved = result[key] as {
        position: number;
        duration: number;
        updatedAt: number;
    } | undefined;

    if (!saved) {
        console.log(
            `[OCW Bookmarker] No previous progress for ${videoId}.`
        );
        return;
    }

    if (
        !Number.isFinite(saved.position) ||
        saved.position < 5
    ) {
        console.log(
            `[OCW Bookmarker] Saved position is too small for ${videoId}.`
        );
        return;
    }

    console.log(
        `[OCW Bookmarker] Found saved position: ${saved.position.toFixed(1)}s`
    );

    const resume = () => {
        if (!video.isConnected) {
            return;
        }

        if (
            video.readyState >= 1 &&
            Number.isFinite(video.duration) &&
            video.duration > 0
        ) {
            const position = Math.min(
                saved.position,
                video.duration - 1
            );

            if (position > 0) {
                video.currentTime = position;

                console.log(
                    `[OCW Bookmarker] Resumed ${videoId} at ${position.toFixed(1)}s`
                );
            }
        }
    };

    if (video.readyState >= 1) {
        resume();
    } else {
        video.addEventListener("loadedmetadata", resume, {
            once: true
        });
    }
}

function startSaving(): void {
    if (saveTimer !== null) {
        clearInterval(saveTimer);
    }

    saveTimer = setInterval(() => {
        void saveProgress();
    }, 5000);

    console.log("[OCW Bookmarker] Progress saving started.");
}

async function handleVideoChange(): Promise<void> {
    const videoId = getVideoId();

    if (!videoId) {
        return;
    }

    if (videoId === currentVideoId) {
        return;
    }

    currentVideoId = videoId;

    console.log(
        `[OCW Bookmarker] New video detected: ${videoId}`
    );

    let video: HTMLVideoElement | null = null;

    // Wait for the YouTube player to create its <video> element.
    for (let i = 0; i < 40; i++) {
        video = getVideo();

        if (video) {
            break;
        }

        await new Promise(resolve => setTimeout(resolve, 500));
    }

    if (!video) {
        console.log(
            "[OCW Bookmarker] Video element not found."
        );
        return;
    }

    await resumeProgress(videoId);

    startSaving();
}

void handleVideoChange();

