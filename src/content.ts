console.log("[OCW Bookmarker] Extension loaded.");


type VideoProgress = {
    position: number;
    duration: number;
    updatedAt: number;
};


let currentVideoId: string | null = null;
let saveTimer: ReturnType<typeof setInterval> | null = null;


/* =========================================
   VIDEO DETECTION
   ========================================= */

function getVideoId(): string | null {
    const url = new URL(window.location.href);

    /*
     * Normal YouTube watch page:
     * https://www.youtube.com/watch?v=VIDEO_ID
     */

    if (url.pathname === "/watch") {
        return url.searchParams.get("v");
    }


    /*
     * YouTube embedded player used by MIT OCW:
     * https://www.youtube.com/embed/VIDEO_ID
     */

    if (url.pathname.startsWith("/embed/")) {

        const id =
            url.pathname.split("/")[2];

        if (id) {
            return id;
        }
    }


    return null;
}


function getVideo(): HTMLVideoElement | null {
    return document.querySelector("video");
}


/* =========================================
   SAVE PROGRESS
   ========================================= */

function saveProgress(): void {

    const video =
        getVideo();

    const videoId =
        currentVideoId ?? getVideoId();


    if (!video || !videoId) {
        return;
    }


    if (
        !Number.isFinite(video.currentTime) ||
        !Number.isFinite(video.duration) ||
        video.duration <= 0
    ) {
        return;
    }


    const position =
        video.currentTime;

    const duration =
        video.duration;


    const progress: VideoProgress = {
        position,
        duration,
        updatedAt: Date.now()
    };


    chrome.storage.local.set({

        [`video_${videoId}`]:
            progress,

        activeVideoState: {
            videoId,
            position,
            duration,
            updatedAt: Date.now()
        }

    });


    console.log(
        `[OCW Bookmarker] Saved ${position.toFixed(1)} seconds for ${videoId}`
    );
}


/* =========================================
   RESUME PROGRESS
   ========================================= */

function resumeProgress(
    videoId: string
): void {

    const video =
        getVideo();


    if (!video) {
        return;
    }


    chrome.storage.local.get(
        `video_${videoId}`,
        result => {

            const saved =
                result[`video_${videoId}`] as
                    | VideoProgress
                    | undefined;


            if (!saved) {

                console.log(
                    `[OCW Bookmarker] No saved progress for ${videoId}.`
                );

                return;
            }


            if (
                !Number.isFinite(saved.position) ||
                saved.position < 5
            ) {
                return;
            }


            const resume = () => {

                if (
                    !video.isConnected ||
                    !Number.isFinite(video.duration) ||
                    video.duration <= 0
                ) {
                    return;
                }


                const position =
                    Math.min(
                        saved.position,
                        Math.max(
                            0,
                            video.duration - 1
                        )
                    );


                if (position <= 0) {
                    return;
                }


                video.currentTime =
                    position;


                console.log(
                    `[OCW Bookmarker] Resumed ${videoId} at ${position.toFixed(1)} seconds`
                );
            };


            if (video.readyState >= 1) {

                resume();

            } else {

                video.addEventListener(
                    "loadedmetadata",
                    resume,
                    { once: true }
                );
            }
        }
    );
}


/* =========================================
   ACTIVE VIDEO STATE
   ========================================= */

function setActiveVideo(
    videoId: string
): void {

    currentVideoId =
        videoId;


    chrome.storage.local.set({
        activeVideoId:
            videoId
    });


    console.log(
        `[OCW Bookmarker] Active video: ${videoId}`
    );
}


/* =========================================
   HANDLE VIDEO CHANGES
   ========================================= */

async function handleVideoChange(): Promise<void> {

    const videoId =
        getVideoId();


    if (!videoId) {
        return;
    }


    if (videoId === currentVideoId) {
        return;
    }


    setActiveVideo(videoId);


    let video:
        HTMLVideoElement | null =
        null;


    /*
     * Wait for YouTube to create
     * the <video> element.
     */

    for (
        let i = 0;
        i < 40;
        i++
    ) {

        video =
            getVideo();


        if (video) {
            break;
        }


        await new Promise(resolve =>
            setTimeout(
                resolve,
                500
            )
        );
    }


    if (!video) {

        console.log(
            "[OCW Bookmarker] Video element not found."
        );

        return;
    }


    console.log(
        "[OCW Bookmarker] YouTube video detected."
    );


    resumeProgress(
        videoId
    );


    startSaving();
}


/* =========================================
   PROGRESS SAVING TIMER
   ========================================= */

function startSaving(): void {

    if (saveTimer !== null) {

        clearInterval(
            saveTimer
        );
    }


    saveTimer =
        setInterval(
            () => {
                saveProgress();
            },
            5000
        );


    console.log(
        "[OCW Bookmarker] Progress saving started."
    );
}


/* =========================================
   POPUP COMMUNICATION
   ========================================= */

chrome.runtime.onMessage.addListener(
    (
        message,
        _sender,
        sendResponse
    ) => {

        /* -------------------------------------
           GET CURRENT VIDEO STATE
           ------------------------------------- */

        if (
            message?.type ===
            "GET_VIDEO_STATE"
        ) {

            const video =
                getVideo();


            if (
                !video ||
                !currentVideoId
            ) {

                sendResponse({
                    ok: false
                });

                return;
            }


            sendResponse({

                ok: true,

                videoId:
                    currentVideoId,

                position:
                    video.currentTime,

                duration:
                    video.duration

            });


            return;
        }


        /* -------------------------------------
           RESUME VIDEO
           ------------------------------------- */

        if (
            message?.type ===
            "RESUME_VIDEO"
        ) {

            const video =
                getVideo();


            if (
                !video ||
                !currentVideoId
            ) {

                sendResponse({
                    ok: false,
                    reason:
                        "VIDEO_NOT_FOUND"
                });

                return;
            }


            /*
             * Never allow the popup to control
             * a different YouTube video.
             */

            if (
                message.videoId !==
                currentVideoId
            ) {

                sendResponse({
                    ok: false,
                    reason:
                        "VIDEO_ID_MISMATCH"
                });

                return;
            }


            const requestedPosition =
                Number(
                    message.position
                );


            if (
                !Number.isFinite(
                    requestedPosition
                ) ||
                requestedPosition < 0
            ) {

                sendResponse({
                    ok: false,
                    reason:
                        "INVALID_POSITION"
                });

                return;
            }


            const seek =
                () => {

                    if (
                        !video.isConnected ||
                        !Number.isFinite(
                            video.duration
                        ) ||
                        video.duration <= 0
                    ) {
                        return;
                    }


                    const position =
                        Math.min(
                            requestedPosition,
                            Math.max(
                                0,
                                video.duration - 1
                            )
                        );


                    video.currentTime =
                        position;


                    /*
                     * If autoplay policy allows it,
                     * continue playing immediately.
                     *
                     * Seeking itself still works if
                     * play() is rejected.
                     */

                    void video
                        .play()
                        .catch(error => {

                            console.log(
                                "[OCW Bookmarker] Browser blocked automatic playback:",
                                error
                            );
                        });


                    console.log(
                        `[OCW Bookmarker] Popup resume → ${position.toFixed(1)} seconds`
                    );
                };


            if (
                video.readyState >= 1 &&
                Number.isFinite(
                    video.duration
                ) &&
                video.duration > 0
            ) {

                seek();

            } else {

                video.addEventListener(
                    "loadedmetadata",
                    seek,
                    { once: true }
                );
            }


            sendResponse({
                ok: true
            });


            return;
        }
    }
);


/* =========================================
   START
   ========================================= */

void handleVideoChange();
