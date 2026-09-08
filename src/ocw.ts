console.log("[OCW Bookmarker] OCW detector loaded.");
export { };

type Reading = {
    lectureNumber: number;
    lectureTitle: string;
    sections: string;
};


type Lecture = {
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


type CourseState = {
    courseId: string;
    courseTitle: string;

    url: string;

    term: string;

    readingsUrl: string;
    calendarUrl: string;
    lectureNotesUrl: string;
    problemSetsUrl: string;

    textbookTitle: string;

    lectures: Lecture[];

    problemSets: ProblemSet[];

    currentLectureIndex:
        number | null;

    updatedAt: number;
};


/* =========================================
   COURSE DETECTION
   ========================================= */

function getCourseId(): string | null {

    const match =
        window.location.pathname.match(
            /^\/courses\/([^/]+)/
        );


    return match?.[1] ?? null;
}


/* =========================================
   COURSE BASE URL
   ========================================= */

function getCourseBaseUrl(
    courseId: string
): string {

    return `${window.location.origin}/courses/${courseId}`;
}


/* =========================================
   CURRENT RESOURCE
   ========================================= */

function getResourcePath(): string | null {

    const match =
        window.location.pathname.match(
            /^\/courses\/[^/]+\/resources\/([^/]+)/
        );


    return match?.[1] ?? null;
}


/* =========================================
   COURSE TITLE
   ========================================= */

function getCourseTitle(): string {

    const heading =
        document.querySelector("h1");


    return (
        heading?.textContent?.trim()
        ?? ""
    );
}


/* =========================================
   TERM
   ========================================= */

function getCourseTerm(
    courseId: string
): string {

    const match =
        courseId.match(
            /-(spring|summer|fall|winter)-(\d{4})$/i
        );


    if (!match) {
        return "";
    }


    const season =
        match[1]
            .charAt(0)
            .toUpperCase() +
        match[1]
            .slice(1)
            .toLowerCase();


    return `${season} ${match[2]}`;
}


/* =========================================
   COURSE SECTION URL
   ========================================= */

function getCourseSectionUrl(
    label: string,
    fallback: string
): string {

    const link =
        [
            ...document.querySelectorAll<HTMLAnchorElement>(
                "a"
            )
        ].find(anchor =>
            anchor.textContent
                ?.trim()
                .toLowerCase() ===
            label.toLowerCase()
        );


    return link?.href ?? fallback;
}


/* =========================================
   FIND VIDEO LECTURES URL
   ========================================= */

function getVideoLecturesUrl(): string | null {

    const link =
        [
            ...document.querySelectorAll<HTMLAnchorElement>(
                "a"
            )
        ].find(anchor =>
            anchor.textContent
                ?.trim()
                .toLowerCase() ===
            "video lectures"
        );


    return link?.href ?? null;
}


/* =========================================
   PARSE LECTURE NUMBER
   ========================================= */

function getLectureNumber(
    text: string
): number | null {

    const match =
        text.match(
            /^Lecture\s+(\d+):/i
        );


    return match
        ? Number(match[1])
        : null;
}


/* =========================================
   RESOURCE PATH FROM URL
   ========================================= */

function getResourcePathFromUrl(
    url: string
): string {

    const match =
        url.match(
            /\/resources\/([^/]+)/
        );


    return match?.[1] ?? "";
}


/* =========================================
   DIRECT PDF URL
   ========================================= */

function getPdfDownloadUrl(
    resourceUrl: string
): string | null {

    try {

        const url =
            new URL(
                resourceUrl
            );


        /*
         * MIT OCW resource pages use URLs like:
         *
         * /courses/COURSE/resources/
         * mit18_100b_s25_lec04_pdf/
         *
         * The downloadable file is:
         *
         * /courses/COURSE/
         * mit18_100b_s25_lec04.pdf
         */

        const match =
            url.pathname.match(
                /^(\/courses\/[^/]+)\/resources\/([^/]+)_pdf\/?$/
            );


        if (match) {

            return (
                `${url.origin}` +
                `${match[1]}/` +
                `${match[2]}.pdf`
            );
        }


        /*
         * Already a PDF.
         */

        if (
            url.pathname
                .toLowerCase()
                .endsWith(".pdf")
        ) {
            return url.href;
        }


    } catch (error) {

        console.error(
            "[OCW Bookmarker] Failed to parse PDF URL:",
            error
        );
    }


    return null;
}


/* =========================================
   FETCH DOCUMENT
   ========================================= */

async function fetchDocument(
    url: string
): Promise<Document | null> {

    try {

        const response =
            await fetch(url);


        if (!response.ok) {

            console.error(
                "[OCW Bookmarker] Failed to fetch:",
                url,
                response.status
            );

            return null;
        }


        const html =
            await response.text();


        const parser =
            new DOMParser();


        return parser.parseFromString(
            html,
            "text/html"
        );

    } catch (error) {

        console.error(
            "[OCW Bookmarker] Fetch failed:",
            url,
            error
        );


        return null;
    }
}


/* =========================================
   PARSE VIDEO LECTURES
   ========================================= */

function parseLectures(
    html: string
): Lecture[] {

    const parser =
        new DOMParser();


    const document =
        parser.parseFromString(
            html,
            "text/html"
        );


    const lectures =
        [
            ...document.querySelectorAll<HTMLAnchorElement>(
                "a"
            )
        ]
            .filter(anchor =>
                anchor.href.includes(
                    "/resources/"
                )
            )
            .map(anchor => {

                const title =
                    anchor.textContent
                        ?.trim() ?? "";


                const url =
                    anchor.href;


                return {

                    number:
                        getLectureNumber(
                            title
                        ),

                    title,

                    url,

                    resourcePath:
                        getResourcePathFromUrl(
                            url
                        ),

                    reading:
                        null,

                    notesUrl:
                        null,

                    notesDownloadUrl:
                        null

                };
            })
            .filter(lecture =>
                lecture.title.length > 0 &&
                lecture.resourcePath.length > 0
            );


    /*
     * Remove duplicate resource links.
     */

    const seen =
        new Set<string>();


    return lectures.filter(
        lecture => {

            if (
                seen.has(
                    lecture.resourcePath
                )
            ) {
                return false;
            }


            seen.add(
                lecture.resourcePath
            );


            return true;
        }
    );
}


/* =========================================
   FETCH LECTURE CATALOG
   ========================================= */

async function getLectures(): Promise<
    Lecture[] | null
> {

    const galleryUrl =
        getVideoLecturesUrl();


    if (!galleryUrl) {

        console.log(
            "[OCW Bookmarker] Video Lectures link not found."
        );

        return null;
    }


    try {

        const response =
            await fetch(
                galleryUrl
            );


        if (!response.ok) {

            console.error(
                "[OCW Bookmarker] Failed to fetch lecture gallery:",
                response.status
            );

            return null;
        }


        const html =
            await response.text();


        return parseLectures(
            html
        );

    } catch (error) {

        console.error(
            "[OCW Bookmarker] Failed to fetch lecture gallery.",
            error
        );


        return null;
    }
}


/* =========================================
   PARSE READINGS
   ========================================= */

function parseReadings(
    document: Document
): Map<number, Reading> {

    const readings =
        new Map<number, Reading>();


    const rows =
        [
            ...document.querySelectorAll<HTMLTableRowElement>(
                "table tr"
            )
        ];


    for (const row of rows) {

        const cells =
            [
                ...row.querySelectorAll<HTMLTableCellElement>(
                    "th, td"
                )
            ].map(cell =>
                cell.textContent
                    ?.replace(
                        /\s+/g,
                        " "
                    )
                    .trim() ?? ""
            );


        if (cells.length < 3) {
            continue;
        }


        const number =
            Number.parseInt(
                cells[0],
                10
            );


        if (
            !Number.isFinite(number)
        ) {
            continue;
        }


        const lectureTitle =
            cells[1];


        const sections =
            cells[2] || "<none>";


        readings.set(
            number,
            {
                lectureNumber:
                    number,

                lectureTitle,

                sections
            }
        );
    }


    return readings;
}


/* =========================================
   FETCH READINGS
   ========================================= */

async function getReadings(
    url: string
): Promise<
    Map<number, Reading> | null
> {

    const document =
        await fetchDocument(
            url
        );


    if (!document) {
        return null;
    }


    return parseReadings(
        document
    );
}


/* =========================================
   PARSE CALENDAR
   ========================================= */

function parseCalendar(
    document: Document
): Map<number, number> {

    const result =
        new Map<
            number,
            number
        >();


    const main =
        document.querySelector(
            "main"
        );


    const text =
        (
            main?.textContent ??
            document.body.textContent ??
            ""
        )
            .replace(
                /\s+/g,
                " "
            );


    const lectures =
        [
            ...text.matchAll(
                /Lecture\s+(\d+)\s*:/gi
            )
        ];


    const problemSets =
        [
            ...text.matchAll(
                /Problem\s+set\s+(\d+)\s+due/gi
            )
        ];


    for (const psetMatch of problemSets) {

        const psetNumber =
            Number(
                psetMatch[1]
            );


        const psetPosition =
            psetMatch.index ??
            0;


        let latestLecture:
            number | null =
            null;

        let latestLecturePosition =
            -1;


        for (const lectureMatch of lectures) {

            const lecturePosition =
                lectureMatch.index ??
                0;


            if (
                lecturePosition <
                    psetPosition &&
                lecturePosition >
                    latestLecturePosition
            ) {

                latestLecture =
                    Number(
                        lectureMatch[1]
                    );

                latestLecturePosition =
                    lecturePosition;
            }
        }


        if (
            latestLecture !== null
        ) {

            result.set(
                psetNumber,
                latestLecture
            );
        }
    }


    return result;
}


/* =========================================
   FETCH CALENDAR
   ========================================= */

async function getCalendar(
    url: string
): Promise<
    Map<number, number> | null
> {

    const document =
        await fetchDocument(
            url
        );


    if (!document) {
        return null;
    }


    return parseCalendar(
        document
    );
}


/* =========================================
   PARSE LECTURE NOTES
   ========================================= */

function parseLectureNotes(
    document: Document
): Map<
    number,
    {
        url: string;
        downloadUrl: string | null;
    }
> {

    const notes =
        new Map<
            number,
            {
                url: string;
                downloadUrl: string | null;
            }
        >();


    const anchors =
        [
            ...document.querySelectorAll<HTMLAnchorElement>(
                "a"
            )
        ];


    for (const anchor of anchors) {

        const text =
            anchor.textContent
                ?.replace(
                    /\s+/g,
                    " "
                )
                .trim() ?? "";


        const match =
            text.match(
                /^Lecture\s+(\d+):/i
            );


        if (!match) {
            continue;
        }


        const number =
            Number(
                match[1]
            );


        notes.set(
            number,
            {
                url:
                    anchor.href,

                downloadUrl:
                    getPdfDownloadUrl(
                        anchor.href
                    )
            }
        );
    }


    return notes;
}


/* =========================================
   FETCH LECTURE NOTES
   ========================================= */

async function getLectureNotes(
    url: string
): Promise<
    Map<
        number,
        {
            url: string;
            downloadUrl: string | null;
        }
    > | null
> {

    const document =
        await fetchDocument(
            url
        );


    if (!document) {
        return null;
    }


    return parseLectureNotes(
        document
    );
}


/* =========================================
   PARSE PROBLEM SETS
   ========================================= */

function parseProblemSets(
    document: Document,
    dueMap: Map<number, number>
): ProblemSet[] {

    const problemSets =
        new Map<
            number,
            ProblemSet
        >();


    const anchors =
        [
            ...document.querySelectorAll<HTMLAnchorElement>(
                "a"
            )
        ];


    for (const anchor of anchors) {

        const text =
            anchor.textContent
                ?.replace(
                    /\s+/g,
                    " "
                )
                .trim() ?? "";


        const match =
            text.match(
                /^Problem\s+Set\s+(\d+)/i
            );


        if (!match) {
            continue;
        }


        const number =
            Number(
                match[1]
            );


        if (
            problemSets.has(
                number
            )
        ) {
            continue;
        }


        problemSets.set(
            number,
            {

                number,

                title:
                    `Problem Set ${number}`,

                url:
                    anchor.href,

                resourcePath:
                    getResourcePathFromUrl(
                        anchor.href
                    ),

                downloadUrl:
                    getPdfDownloadUrl(
                        anchor.href
                    ),

                dueAfterLecture:
                    dueMap.get(
                        number
                    ) ?? null

            }
        );
    }


    return [
        ...problemSets.values()
    ].sort(
        (a, b) =>
            a.number - b.number
    );
}


/* =========================================
   FETCH PROBLEM SETS
   ========================================= */

async function getProblemSets(
    url: string,
    dueMap: Map<number, number>
): Promise<
    ProblemSet[] | null
> {

    const document =
        await fetchDocument(
            url
        );


    if (!document) {
        return null;
    }


    return parseProblemSets(
        document,
        dueMap
    );
}


/* =========================================
   FIND CURRENT LECTURE
   ========================================= */

function getCurrentLectureIndex(
    lectures: Lecture[]
): number | null {

    const currentResource =
        getResourcePath();


    if (!currentResource) {
        return null;
    }


    const index =
        lectures.findIndex(
            lecture =>
                lecture.resourcePath ===
                currentResource
        );


    return index >= 0
        ? index
        : null;
}


/* =========================================
   WAIT FOR CURRENT RESOURCE
   ========================================= */

async function waitForCurrentLecture(
    lectures: Lecture[]
): Promise<number | null> {

    for (
        let attempt = 0;
        attempt < 10;
        attempt++
    ) {

        const index =
            getCurrentLectureIndex(
                lectures
            );


        if (index !== null) {
            return index;
        }


        await new Promise(resolve =>
            setTimeout(
                resolve,
                500
            )
        );
    }


    return null;
}


/* =========================================
   LOAD PREVIOUS COURSE STATE
   ========================================= */

async function getStoredCourseState(
    courseId: string
): Promise<CourseState | null> {

    const result =
        await chrome.storage.local.get(
            "activeCourseState"
        );


    const stored =
        result.activeCourseState as
            | CourseState
            | undefined;


    if (
        !stored ||
        stored.courseId !==
            courseId
    ) {
        return null;
    }


    return stored;
}


/* =========================================
   DETECT OCW STATE
   ========================================= */

async function detectOCW(): Promise<void> {

    const courseId =
        getCourseId();


    if (!courseId) {

        console.log(
            "[OCW Bookmarker] Not an OCW course page."
        );

        return;
    }


    const previousState =
        await getStoredCourseState(
            courseId
        );


    const courseBase =
        getCourseBaseUrl(
            courseId
        );


    /*
     * Discover the OCW course section URLs
     * from the course page itself.
     */

    const readingsUrl =
        getCourseSectionUrl(
            "Readings",
            `${courseBase}/pages/readings/`
        );


    const calendarUrl =
        getCourseSectionUrl(
            "Calendar",
            `${courseBase}/pages/calendar/`
        );


    const lectureNotesUrl =
        getCourseSectionUrl(
            "Lecture Notes",
            `${courseBase}/pages/lecture-notes/`
        );


    const problemSetsUrl =
        getCourseSectionUrl(
            "Problem Sets",
            `${courseBase}/pages/problem-sets/`
        );


    /*
     * Fetch OCW metadata in parallel.
     */

    const [
        lecturesResult,
        readingsResult,
        calendarResult,
        notesResult
    ] = await Promise.all([

        getLectures(),

        getReadings(
            readingsUrl
        ),

        getCalendar(
            calendarUrl
        ),

        getLectureNotes(
            lectureNotesUrl
        )

    ]);


    /*
     * Determine whether the metadata fetch
     * succeeded before replacing stored data.
     */

    const lectures =
        lecturesResult ??
        previousState?.lectures ??
        [];


    const readings =
        readingsResult;


    const calendar =
        calendarResult ??
        new Map<number, number>();


    const notes =
        notesResult;


    /*
     * Problem sets depend on calendar data.
     */

    const problemSetsResult =
        await getProblemSets(
            problemSetsUrl,
            calendar
        );


    const problemSets =
        problemSetsResult ??
        previousState?.problemSets ??
        [];


    /*
     * Attach readings and lecture notes
     * to each lecture.
     */

    const enrichedLectures =
        lectures.map(
            lecture => {

                const reading =
                    lecture.number !== null &&
                    readings
                        ? readings.get(
                            lecture.number
                        ) ?? null
                        : null;


                const note =
                    lecture.number !== null &&
                    notes
                        ? notes.get(
                            lecture.number
                        )
                        : undefined;


                return {

                    ...lecture,

                    reading,

                    notesUrl:
                        note?.url ??
                        null,

                    notesDownloadUrl:
                        note?.downloadUrl ??
                        null

                };
            }
        );


    /*
     * Give OCW time to settle its URL.
     */

    const detectedLectureIndex =
        await waitForCurrentLecture(
            enrichedLectures
        );


    /*
     * Preserve the previous valid lecture
     * if OCW is temporarily between URLs.
     */

    let currentLectureIndex =
        detectedLectureIndex;


    if (
        currentLectureIndex ===
            null
    ) {

        if (
            previousState &&
            previousState.currentLectureIndex !==
                null
        ) {

            currentLectureIndex =
                previousState.currentLectureIndex;


            console.log(
                "[OCW Bookmarker] Preserving previous lecture:",
                currentLectureIndex
            );
        }
    }


    const courseState: CourseState = {

        courseId,

        courseTitle:
            getCourseTitle(),

        url:
            window.location.href,

        term:
            getCourseTerm(
                courseId
            ),

        readingsUrl,

        calendarUrl,

        lectureNotesUrl,

        problemSetsUrl,

        textbookTitle:
            "Elementary Real Analysis",

        lectures:
            enrichedLectures,

        problemSets,

        currentLectureIndex,

        updatedAt:
            Date.now()

    };


    await chrome.storage.local.set({
        activeCourseState:
            courseState
    });


    console.log(
        "[OCW Bookmarker] Course:",
        courseId
    );


    console.log(
        "[OCW Bookmarker] Lectures:",
        enrichedLectures.length
    );


    console.log(
        "[OCW Bookmarker] Problem sets:",
        problemSets.length
    );


    console.log(
        "[OCW Bookmarker] Current lecture:",
        currentLectureIndex
    );


    console.log(
        "[OCW Bookmarker] Metadata loaded."
    );
}


/* =========================================
   START
   ========================================= */

void detectOCW();
