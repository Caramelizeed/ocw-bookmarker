console.log("[OCW Bookmarker] Popup loaded.");

export {};


type Reading = {
    lectureNumber: number;
    lectureTitle: string;
    sections: string;
};


type VideoResource = {
    number: number | null;
    title: string;
    url: string;
    resourcePath: string;

    reading: Reading | null;

    notesUrl: string | null;
    notesDownloadUrl: string | null;
};


type ProblemSet = {
    number: number;
    title: string;

    url: string;
    resourcePath: string;

    downloadUrl: string | null;

    dueAfterLecture:
        number | null;
};


type StoredCourseState = {
    courseId: string;
    courseTitle: string;

    url: string;

    term: string;

    readingsUrl: string;
    calendarUrl: string;
    lectureNotesUrl: string;
    problemSetsUrl: string;

    textbookTitle: string;

    lectures: VideoResource[];

    problemSets: ProblemSet[];

    currentLectureIndex:
        number | null;

    updatedAt: number;
};


type ActiveVideoState = {
    videoId: string;
    position: number;
    duration: number;
};


/* =========================================
   GLOBAL STATE
   ========================================= */

let courseState:
    StoredCourseState | null =
    null;


let videoState:
    ActiveVideoState | null =
    null;


let progressTimer:
    ReturnType<typeof setInterval> | null =
    null;


/* =========================================
   FORMAT TIME
   ========================================= */

function formatTime(
    seconds: number
): string {

    if (
        !Number.isFinite(seconds) ||
        seconds < 0
    ) {

        return "00:00";
    }


    const totalSeconds =
        Math.floor(
            seconds
        );


    const hours =
        Math.floor(
            totalSeconds / 3600
        );


    const minutes =
        Math.floor(
            (totalSeconds % 3600) / 60
        );


    const remainingSeconds =
        totalSeconds % 60;


    if (hours > 0) {

        return (
            `${hours}:` +
            `${String(minutes).padStart(2, "0")}:` +
            `${String(remainingSeconds).padStart(2, "0")}`
        );
    }


    return (
        `${String(minutes).padStart(2, "0")}:` +
        `${String(remainingSeconds).padStart(2, "0")}`
    );
}


/* =========================================
   GET ELEMENT
   ========================================= */

function getElement<T extends HTMLElement>(
    id: string
): T | null {

    return document.getElementById(
        id
    ) as T | null;
}


/* =========================================
   COURSE CODE
   ========================================= */

function getCourseCode(
    courseId: string
): string {

    const match =
        courseId.match(
            /^(\d+)-(\d+[a-z]?)\-/
        );


    if (!match) {

        return courseId;
    }


    return (
        `${match[1]}.${match[2]}`
    ).toUpperCase();
}


/* =========================================
   UPDATE PROGRESS
   ========================================= */

function updateProgress(
    position: number,
    duration: number
): void {

    if (
        !Number.isFinite(position) ||
        !Number.isFinite(duration) ||
        duration <= 0
    ) {

        return;
    }


    const percentage =
        Math.min(
            100,
            Math.max(
                0,
                (position / duration) * 100
            )
        );


    const currentTime =
        getElement(
            "current-time"
        );


    const totalTime =
        getElement(
            "total-time"
        );


    const percentageElement =
        getElement(
            "percentage"
        );


    const resumeTime =
        getElement(
            "resume-time"
        );


    const progressFill =
        getElement<HTMLElement>(
            "progress-fill"
        );


    const progressMarker =
        getElement<HTMLElement>(
            "progress-marker"
        );


    if (currentTime) {

        currentTime.textContent =
            formatTime(
                position
            );
    }


    if (totalTime) {

        totalTime.textContent =
            formatTime(
                duration
            );
    }


    if (percentageElement) {

        percentageElement.textContent =
            `${Math.round(percentage)}%`;
    }


    if (resumeTime) {

        resumeTime.textContent =
            formatTime(
                position
            );
    }


    if (progressFill) {

        progressFill.style.width =
            `${percentage}%`;
    }


    if (progressMarker) {

        progressMarker.style.left =
            `${percentage}%`;
    }
}


/* =========================================
   RENDER COURSE
   ========================================= */

function renderCourse(
    course: StoredCourseState
): void {

    const courseCode =
        getElement(
            "course-code"
        );


    const courseCodeLarge =
        getElement(
            "course-code-large"
        );


    const courseTerm =
        getElement(
            "course-term"
        );


    const courseTitle =
        getElement(
            "course-title"
        );


    const lectureNumber =
        getElement(
            "lecture-number"
        );


    const lectureTitle =
        getElement(
            "lecture-title"
        );


    const previousButton =
        getElement<HTMLButtonElement>(
            "previous-button"
        );


    const nextButton =
        getElement<HTMLButtonElement>(
            "next-button"
        );


    const previousLabel =
        getElement(
            "previous-label"
        );


    const nextLabel =
        getElement(
            "next-label"
        );


    const code =
        getCourseCode(
            course.courseId
        );


    if (courseCode) {

        courseCode.textContent =
            code;
    }


    if (courseCodeLarge) {

        courseCodeLarge.textContent =
            code;
    }


    if (courseTerm) {

        courseTerm.textContent =
            course.term || "--";
    }


    if (courseTitle) {

        courseTitle.textContent =
            course.courseTitle ||
            "Unknown Course";
    }


    const index =
        course.currentLectureIndex;


    if (
        index === null ||
        index < 0 ||
        index >=
            course.lectures.length
    ) {

        if (lectureNumber) {

            lectureNumber.textContent =
                "NO CURRENT LECTURE";
        }


        if (lectureTitle) {

            lectureTitle.textContent =
                "Open an OCW lecture to begin.";
        }


        if (previousButton) {

            previousButton.disabled =
                true;
        }


        if (nextButton) {

            nextButton.disabled =
                true;
        }


        renderStudyState(
            null
        );


        return;
    }


    const current =
        course.lectures[index];


    if (lectureNumber) {

        lectureNumber.textContent =
            current.number !== null
                ? `LECTURE ${String(
                    current.number
                ).padStart(2, "0")}`
                : "REVIEW";
    }


    if (lectureTitle) {

        lectureTitle.textContent =
            current.title.replace(
                /^Lecture\s+\d+:\s*/i,
                ""
            );
    }


    /*
     * Previous lecture
     */

    if (index > 0) {

        const previous =
            course.lectures[
                index - 1
            ];


        if (previousLabel) {

            previousLabel.textContent =
                getNavigationLabel(
                    previous
                );
        }


        if (previousButton) {

            previousButton.disabled =
                false;
        }

    } else {

        if (previousLabel) {

            previousLabel.textContent =
                "Previous";
        }


        if (previousButton) {

            previousButton.disabled =
                true;
        }
    }


    /*
     * Next lecture
     */

    if (
        index <
        course.lectures.length - 1
    ) {

        const next =
            course.lectures[
                index + 1
            ];


        if (nextLabel) {

            nextLabel.textContent =
                getNavigationLabel(
                    next
                );
        }


        if (nextButton) {

            nextButton.disabled =
                false;
        }

    } else {

        if (nextLabel) {

            nextLabel.textContent =
                "Next";
        }


        if (nextButton) {

            nextButton.disabled =
                true;
        }
    }


    renderStudyState(
        current
    );
}


/* =========================================
   NAVIGATION LABEL
   ========================================= */

function getNavigationLabel(
    video: VideoResource
): string {

    if (
        video.number !== null
    ) {

        return `Lec ${String(
            video.number
        ).padStart(2, "0")}`;
    }


    const title =
        video.title.toLowerCase();


    if (
        title.includes("midterm")
    ) {

        return "Midterm Review";
    }


    if (
        title.includes("final")
    ) {

        return "Final Review";
    }


    return "Review";
}


/* =========================================
   RENDER STUDY STATE
   ========================================= */

function renderStudyState(
    lecture:
        VideoResource | null
): void {

    const readingSections =
        getElement(
            "reading-sections"
        );


    const notesTitle =
        getElement(
            "notes-title"
        );


    const notesMeta =
        getElement(
            "notes-meta"
        );


    const notesButton =
        getElement<HTMLButtonElement>(
            "notes-download"
        );


    const psetTitle =
        getElement(
            "pset-title"
        );


    const psetMeta =
        getElement(
            "pset-meta"
        );


    const psetButton =
        getElement<HTMLButtonElement>(
            "pset-download"
        );


    if (!lecture) {

        if (readingSections) {

            readingSections.textContent =
                "Open a lecture to load readings.";
        }


        return;
    }


    /*
     * Reading recommendation
     */

    if (readingSections) {

        readingSections.textContent =
            lecture.reading?.sections ??
            "No assigned reading listed.";
    }


    /*
     * Lecture notes
     */

    if (notesTitle) {

        notesTitle.textContent =
            lecture.notesUrl
                ? "Lecture Notes"
                : "Lecture Notes unavailable";
    }


    if (notesMeta) {

        notesMeta.textContent =
            lecture.notesUrl
                ? (
                    lecture.notesDownloadUrl
                        ? "PDF available"
                        : "OCW resource"
                )
                : "Not listed for this lecture";
    }


    if (notesButton) {

        notesButton.disabled =
            !lecture.notesUrl;


        notesButton.onclick =
            lecture.notesUrl
                ? () => {

                    void downloadResource(
                        lecture.notesDownloadUrl,
                        lecture.notesUrl,
                        `Lecture ${String(
                            lecture.number ?? 0
                        ).padStart(2, "0")}.pdf`
                    );
                }
                : null;
    }


    /*
     * Upcoming problem set
     */

    const currentLectureNumber =
        lecture.number;


    let upcomingPset:
        ProblemSet | null =
        null;


    if (
        currentLectureNumber !== null &&
        courseState
    ) {

        upcomingPset =
            courseState.problemSets.find(
                pset =>
                    pset.dueAfterLecture !==
                        null &&
                    pset.dueAfterLecture >=
                        currentLectureNumber
            ) ?? null;
    }


    if (!upcomingPset) {

        if (psetTitle) {

            psetTitle.textContent =
                "No upcoming problem set";
        }


        if (psetMeta) {

            psetMeta.textContent =
                "End of scheduled assignments";
        }


        if (psetButton) {

            psetButton.disabled =
                true;
        }


        return;
    }


    if (psetTitle) {

        psetTitle.textContent =
            `PSet ${String(
                upcomingPset.number
            ).padStart(2, "0")}`;
    }


    if (psetMeta) {

        psetMeta.textContent =
            upcomingPset.dueAfterLecture !==
                null
                ? `Due after Lecture ${String(
                    upcomingPset.dueAfterLecture
                ).padStart(2, "0")}`
                : "Due date unavailable";
    }


    if (psetButton) {

        psetButton.disabled =
            !upcomingPset.url;


        psetButton.onclick =
            upcomingPset.url
                ? () => {

                    void downloadResource(
                        upcomingPset.downloadUrl,
                        upcomingPset.url,
                        `Problem Set ${String(
                            upcomingPset.number
                        ).padStart(2, "0")}.pdf`
                    );
                }
                : null;
    }
}


/* =========================================
   LOAD COURSE STATE
   ========================================= */

async function loadStoredCourseState(): Promise<
    StoredCourseState | null
> {

    const result =
        await chrome.storage.local.get(
            "activeCourseState"
        );


    return (
        result.activeCourseState as
            | StoredCourseState
            | undefined
    ) ?? null;
}


/* =========================================
   LOAD VIDEO STATE
   ========================================= */

async function loadVideoState(): Promise<
    ActiveVideoState | null
> {

    const result =
        await chrome.storage.local.get(
            "activeVideoState"
        );


    return (
        result.activeVideoState as
            | ActiveVideoState
            | undefined
    ) ?? null;
}


/* =========================================
   GET ACTIVE TAB
   ========================================= */

async function getActiveTab():
    Promise<chrome.tabs.Tab | null> {

    const tabs =
        await chrome.tabs.query({
            active: true,
            currentWindow: true
        });


    return tabs[0] ?? null;
}


/* =========================================
   SEND MESSAGE TO ACTIVE TAB
   ========================================= */

async function sendToActiveTab(
    message: unknown
): Promise<unknown | null> {

    const tab =
        await getActiveTab();


    if (
        !tab ||
        tab.id === undefined
    ) {

        return null;
    }


    try {

        return await chrome.tabs.sendMessage(
            tab.id,
            message
        );

    } catch (error) {

        console.error(
            "[OCW Bookmarker] Failed to message active tab:",
            error
        );


        return null;
    }
}


/* =========================================
   SYNC LIVE VIDEO STATE
   ========================================= */

async function syncLiveVideoState():
    Promise<void> {

    const response =
        await sendToActiveTab({
            type:
                "GET_VIDEO_STATE"
        });


    if (
        !response ||
        typeof response !== "object"
    ) {

        return;
    }


    const state =
        response as {
            ok?: boolean;
            videoId?: string;
            position?: number;
            duration?: number;
        };


    if (
        state.ok !== true ||
        typeof state.videoId !==
            "string" ||
        typeof state.position !==
            "number" ||
        typeof state.duration !==
            "number"
    ) {

        return;
    }


    videoState = {

        videoId:
            state.videoId,

        position:
            state.position,

        duration:
            state.duration
    };


    updateProgress(
        state.position,
        state.duration
    );
}


/* =========================================
   RESUME VIDEO
   ========================================= */

async function resumeVideo():
    Promise<void> {

    if (!videoState) {

        videoState =
            await loadVideoState();
    }


    if (!videoState) {

        console.log(
            "[OCW Bookmarker] No saved video state."
        );


        return;
    }


    const response =
        await sendToActiveTab({

            type:
                "RESUME_VIDEO",

            videoId:
                videoState.videoId,

            position:
                videoState.position
        });


    console.log(
        "[OCW Bookmarker] Resume response:",
        response
    );
}


/* =========================================
   NAVIGATE TO LECTURE
   ========================================= */

async function navigateToLecture(
    index: number
): Promise<void> {

    if (!courseState) {

        return;
    }


    if (
        index < 0 ||
        index >=
            courseState.lectures.length
    ) {

        return;
    }


    const lecture =
        courseState.lectures[index];


    if (!lecture.url) {

        return;
    }


    const tab =
        await getActiveTab();


    if (
        !tab ||
        tab.id === undefined
    ) {

        return;
    }


    /*
     * Navigation is deliberately restricted
     * to MIT OCW.
     */

    if (
        !tab.url ||
        !tab.url.startsWith(
            "https://ocw.mit.edu/courses/"
        )
    ) {

        console.warn(
            "[OCW Bookmarker] Active tab is not an OCW course page."
        );


        return;
    }


    await chrome.tabs.update(
        tab.id,
        {
            url:
                lecture.url
        }
    );
}


/* =========================================
   DOWNLOAD RESOURCE
   ========================================= */

async function downloadResource(
    downloadUrl: string | null,
    resourceUrl: string | null,
    filename: string
): Promise<void> {

    const url =
        downloadUrl ??
        resourceUrl;


    if (!url) {

        return;
    }


    /*
     * Ask the background service worker
     * to perform the download.
     */

    if (downloadUrl) {

        try {

            const response =
                await chrome.runtime.sendMessage({
                    type:
                        "DOWNLOAD_RESOURCE",

                    url:
                        downloadUrl,

                    filename
                });


            console.log(
                "[OCW Bookmarker] Download response:",
                response
            );


            if (
                response &&
                typeof response === "object" &&
                "ok" in response &&
                response.ok === true
            ) {

                return;
            }

        } catch (error) {

            console.error(
                "[OCW Bookmarker] Download request failed:",
                error
            );
        }
    }


    /*
     * Fallback: open the OCW resource page.
     */

    if (resourceUrl) {

        await chrome.tabs.create({
            url:
                resourceUrl
        });
    }
}


/* =========================================
   BUTTON EVENTS
   ========================================= */

function attachButtonEvents(): void {

    const resumeButton =
        getElement<HTMLButtonElement>(
            "resume-button"
        );


    const previousButton =
        getElement<HTMLButtonElement>(
            "previous-button"
        );


    const nextButton =
        getElement<HTMLButtonElement>(
            "next-button"
        );


    if (resumeButton) {

        resumeButton.addEventListener(
            "click",
            () => {

                void resumeVideo();
            }
        );
    }


    if (previousButton) {

        previousButton.addEventListener(
            "click",
            () => {

                if (
                    !courseState ||
                    courseState.currentLectureIndex ===
                        null
                ) {

                    return;
                }


                void navigateToLecture(
                    courseState.currentLectureIndex - 1
                );
            }
        );
    }


    if (nextButton) {

        nextButton.addEventListener(
            "click",
            () => {

                if (
                    !courseState ||
                    courseState.currentLectureIndex ===
                        null
                ) {

                    return;
                }


                void navigateToLecture(
                    courseState.currentLectureIndex + 1
                );
            }
        );
    }
}


/* =========================================
   INITIALIZE POPUP
   ========================================= */

async function initializePopup():
    Promise<void> {

    try {

        const [
            course,
            video
        ] = await Promise.all([

            loadStoredCourseState(),

            loadVideoState()

        ]);


        courseState =
            course;


        videoState =
            video;


        if (courseState) {

            renderCourse(
                courseState
            );
        }


        if (videoState) {

            updateProgress(
                videoState.position,
                videoState.duration
            );
        }


        attachButtonEvents();


        /*
         * Get the actual current position
         * from the YouTube iframe.
         */

        await syncLiveVideoState();


        /*
         * Keep progress live while popup
         * remains open.
         */

        progressTimer =
            setInterval(
                () => {

                    void syncLiveVideoState();

                },
                1000
            );


        console.log(
            "[OCW Bookmarker] Popup initialized."
        );

    } catch (error) {

        console.error(
            "[OCW Bookmarker] Failed to initialize popup.",
            error
        );
    }
}


/* =========================================
   CLEANUP
   ========================================= */

window.addEventListener(
    "unload",
    () => {

        if (
            progressTimer !== null
        ) {

            clearInterval(
                progressTimer
            );
        }
    }
);


/* =========================================
   START
   ========================================= */

void initializePopup();
