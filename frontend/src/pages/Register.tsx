import {
  CheckOutlined,
  IdcardOutlined,
  PhoneOutlined,
  UserOutlined,
  BookOutlined,
} from "@ant-design/icons";
import { Button, Card, Form, Input, Select, Steps, Typography, message, Grid } from "antd";
import type { FaceLandmarker, FaceLandmarkerResult, NormalizedLandmark } from "@mediapipe/tasks-vision";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePageTitle } from "../hooks/usePageTitle";
import api from "../api/client";
import axios from "axios";
import { login, registerFinalize, registerStart } from "../api/auth";
import { fetchMe } from "../api/user";
import { saveTokens } from "../utils/token";
import { savePendingCredentials } from "../utils/pendingCredentials";
import "./Register.css";

type ProfileFormValues = {
  full_name: string;
  phone: string;
  direction_choice: number | string;
};

type DirectionOption = {
  id: number;
  name: string;
};

type LivenessStage = "idle" | "align" | "left" | "right" | "blink" | "final" | "capturing" | "done";
const ANALYZE_INTERVAL_MS = 170;
const ALIGN_REQUIRED_FRAMES = 8;
const TURN_REQUIRED_FRAMES = 6;
const BLINK_CLOSED_REQUIRED_FRAMES = 2;
const FINAL_ALIGN_REQUIRED_FRAMES = 10;

const LANDMARK_MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/latest/face_landmarker.task";
const LANDMARK_WASM_URL = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm";

const FACE_AREA_MIN = 0.11;
const FACE_AREA_MAX = 0.58;
const ALIGN_CENTER_X_MAX = 0.09;
const ALIGN_CENTER_Y_MAX = 0.1;
const ALIGN_YAW_MAX = 0.09;
const TURN_YAW_MIN = 0.16;
const ROLL_MAX_RAD = 0.22;
const BLINK_CLOSED_RATIO = 0.68;
const BLINK_OPEN_RATIO = 0.9;

const LANDMARK_IDX = {
  nose: 1,
  leftEyeOuter: 33,
  leftEyeInner: 133,
  rightEyeInner: 362,
  rightEyeOuter: 263,
  leftUpper: 159,
  leftLower: 145,
  leftUpper2: 158,
  leftLower2: 153,
  rightUpper: 386,
  rightLower: 374,
  rightUpper2: 385,
  rightLower2: 380,
} as const;

type FaceMetrics = {
  cx: number;
  cy: number;
  area: number;
  yaw: number;
  roll: number;
  ear: number;
  blinkLeft: number | null;
  blinkRight: number | null;
};

const pointDistance = (a: NormalizedLandmark, b: NormalizedLandmark) => Math.hypot(a.x - b.x, a.y - b.y);

const eyeAspectRatio = (
  p1: NormalizedLandmark,
  p2: NormalizedLandmark,
  p3: NormalizedLandmark,
  p4: NormalizedLandmark,
  p5: NormalizedLandmark,
  p6: NormalizedLandmark
) => {
  const horizontal = Math.max(pointDistance(p1, p4), 1e-6);
  return (pointDistance(p2, p6) + pointDistance(p3, p5)) / (2 * horizontal);
};

const blendshapeScore = (result: FaceLandmarkerResult, name: string): number | null => {
  const categories = result.faceBlendshapes?.[0]?.categories;
  if (!categories?.length) return null;
  const found = categories.find((item) => item.categoryName === name);
  return typeof found?.score === "number" ? found.score : null;
};

const faceMetricsFromLandmarks = (landmarks: NormalizedLandmark[], result: FaceLandmarkerResult): FaceMetrics | null => {
  const nose = landmarks[LANDMARK_IDX.nose];
  const leftOuter = landmarks[LANDMARK_IDX.leftEyeOuter];
  const leftInner = landmarks[LANDMARK_IDX.leftEyeInner];
  const rightInner = landmarks[LANDMARK_IDX.rightEyeInner];
  const rightOuter = landmarks[LANDMARK_IDX.rightEyeOuter];
  const leftUpper = landmarks[LANDMARK_IDX.leftUpper];
  const leftUpper2 = landmarks[LANDMARK_IDX.leftUpper2];
  const leftLower = landmarks[LANDMARK_IDX.leftLower];
  const leftLower2 = landmarks[LANDMARK_IDX.leftLower2];
  const rightUpper = landmarks[LANDMARK_IDX.rightUpper];
  const rightUpper2 = landmarks[LANDMARK_IDX.rightUpper2];
  const rightLower = landmarks[LANDMARK_IDX.rightLower];
  const rightLower2 = landmarks[LANDMARK_IDX.rightLower2];

  if (
    !nose || !leftOuter || !leftInner || !rightInner || !rightOuter ||
    !leftUpper || !leftUpper2 || !leftLower || !leftLower2 ||
    !rightUpper || !rightUpper2 || !rightLower || !rightLower2
  ) {
    return null;
  }

  let minX = 1, maxX = 0, minY = 1, maxY = 0;
  for (const point of landmarks) {
    minX = Math.min(minX, point.x);
    maxX = Math.max(maxX, point.x);
    minY = Math.min(minY, point.y);
    maxY = Math.max(maxY, point.y);
  }

  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const area = Math.max((maxX - minX) * (maxY - minY), 0);

  const eyeCenterX = (leftOuter.x + rightOuter.x) / 2;
  const eyeSpan = Math.max(Math.abs(rightOuter.x - leftOuter.x), 1e-6);
  const yaw = (nose.x - eyeCenterX) / eyeSpan;
  const roll = Math.atan2(rightOuter.y - leftOuter.y, rightOuter.x - leftOuter.x);

  const leftEAR = eyeAspectRatio(leftOuter, leftUpper, leftUpper2, leftInner, leftLower2, leftLower);
  const rightEAR = eyeAspectRatio(rightOuter, rightUpper, rightUpper2, rightInner, rightLower2, rightLower);

  return {
    cx, cy, area, yaw, roll,
    ear: (leftEAR + rightEAR) / 2,
    blinkLeft: blendshapeScore(result, "eyeBlinkLeft"),
    blinkRight: blendshapeScore(result, "eyeBlinkRight"),
  };
};

const normalizeApiError = (error: unknown, fallback: string): string => {
  if (!axios.isAxiosError(error)) return fallback;
  const data = error.response?.data;
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (typeof data?.detail === "string") return data.detail;

  if (typeof data === "object") {
    for (const value of Object.values(data)) {
      if (typeof value === "string") return value;
      if (Array.isArray(value) && value.length) return String(value[0]);
      if (value && typeof value === "object") {
        const nested = Object.values(value as Record<string, unknown>);
        if (nested.length) {
          const first = nested[0];
          if (typeof first === "string") return first;
          if (Array.isArray(first) && first.length) return String(first[0]);
        }
      }
    }
  }

  return fallback;
};

const delay = (ms: number) => new Promise((resolve) => window.setTimeout(resolve, ms));

const RegisterPage = () => {
  const { t } = useTranslation();
  usePageTitle('register.title');
  const [form] = Form.useForm();
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);

  const [passportFile, setPassportFile] = useState<File | null>(null);
  const [passportPreview, setPassportPreview] = useState<string | null>(null);
  const [directions, setDirections] = useState<DirectionOption[]>([]);
  const [directionsLoading, setDirectionsLoading] = useState(false);

  const [selfieFile, setSelfieFile] = useState<File | null>(null);
  const [selfiePreview, setSelfiePreview] = useState<string | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [livenessStage, setLivenessStage] = useState<LivenessStage>("idle");
  const [scannerNotice, setScannerNotice] = useState<string | null>(null);
  const [scannerBooting, setScannerBooting] = useState(false);
  const [scanFailed, setScanFailed] = useState(false);
  const [submissionInFlight, setSubmissionInFlight] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const landmarkerLoadingRef = useRef<Promise<FaceLandmarker> | null>(null);
  const analysisTimerRef = useRef<number | null>(null);
  const analysisBusyRef = useRef(false);
  const stableFrameRef = useRef(0);
  const livenessStageRef = useRef<LivenessStage>("idle");
  const cameraActiveRef = useRef(false);
  const videoReadyRef = useRef(false);
  const loadingRef = useRef(false);
  const scannerNoticeRef = useRef<string | null>(null);
  const baselineEarRef = useRef<number | null>(null);
  const blinkClosedRef = useRef(false);
  const blinkClosedFramesRef = useRef(0);
  const yawDirectionRef = useRef<1 | -1>(1);
  const autoScanStartedRef = useRef(false);

  const stepTitles = useMemo(
    () => [t("register.steps.personal"), t("register.steps.passport"), t("register.steps.face")],
    [t]
  );
  const { useBreakpoint } = Grid;
  const screens = useBreakpoint();
  const isMobileView = !screens.sm;

  const livenessInstruction = useMemo(() => {
    if (livenessStage === "align") return t("register.alignFaceHint");
    if (livenessStage === "left") return t("register.lookLeftHint");
    if (livenessStage === "right") return t("register.lookRightHint");
    if (livenessStage === "blink") return t("register.blinkEyesHint");
    if (livenessStage === "final") return t("register.finalAlignHint");
    if (livenessStage === "capturing") return t("register.capturingHint");
    if (livenessStage === "done") return t("register.submittingHint");
    return null;
  }, [livenessStage, t]);

  useEffect(() => {
    if (!passportFile) { setPassportPreview(null); return; }
    const url = URL.createObjectURL(passportFile);
    setPassportPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [passportFile]);

  useEffect(() => {
    let cancelled = false;
    const loadDirections = async () => {
      setDirectionsLoading(true);
      try {
        const res = await api.get<DirectionOption[]>("/api/directions/");
        if (!cancelled) {
          setDirections(Array.isArray(res.data) ? res.data : []);
        }
      } catch {
        if (!cancelled) {
          setDirections([]);
        }
      } finally {
        if (!cancelled) {
          setDirectionsLoading(false);
        }
      }
    };
    void loadDirections();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!selfieFile) { setSelfiePreview(null); return; }
    const url = URL.createObjectURL(selfieFile);
    setSelfiePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [selfieFile]);

  useEffect(() => { livenessStageRef.current = livenessStage; }, [livenessStage]);
  useEffect(() => { cameraActiveRef.current = cameraActive; }, [cameraActive]);
  useEffect(() => { videoReadyRef.current = videoReady; }, [videoReady]);
  useEffect(() => { loadingRef.current = loading; }, [loading]);
  useEffect(() => { scannerNoticeRef.current = scannerNotice; }, [scannerNotice]);

  const setScannerNoticeSafe = (value: string | null) => {
    if (scannerNoticeRef.current === value) return;
    scannerNoticeRef.current = value;
    setScannerNotice(value);
  };

  const resetLivenessState = () => {
    stableFrameRef.current = 0;
    baselineEarRef.current = null;
    blinkClosedRef.current = false;
    blinkClosedFramesRef.current = 0;
    yawDirectionRef.current = 1;
  };

  const ensureFaceLandmarker = async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    if (!landmarkerLoadingRef.current) {
      landmarkerLoadingRef.current = (async () => {
        const vision = await import("@mediapipe/tasks-vision");
        const fileset = await vision.FilesetResolver.forVisionTasks(LANDMARK_WASM_URL);
        const detector = await vision.FaceLandmarker.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: LANDMARK_MODEL_URL, delegate: "CPU" },
          runningMode: "VIDEO",
          numFaces: 1,
          outputFaceBlendshapes: true,
          outputFacialTransformationMatrixes: false,
        });
        landmarkerRef.current = detector;
        return detector;
      })();
    }
    try {
      return await landmarkerLoadingRef.current;
    } catch (error) {
      landmarkerLoadingRef.current = null;
      throw error;
    }
  };

  const stopAnalysis = () => {
    if (analysisTimerRef.current) {
      window.clearInterval(analysisTimerRef.current);
      analysisTimerRef.current = null;
    }
    analysisBusyRef.current = false;
  };

  const setStage = (stage: LivenessStage) => {
    livenessStageRef.current = stage;
    setLivenessStage(stage);
    stableFrameRef.current = 0;
    if (stage !== "blink") {
      blinkClosedRef.current = false;
      blinkClosedFramesRef.current = 0;
    }
  };

  const stopCamera = (options?: { preserveStage?: boolean }) => {
    stopAnalysis();
    resetLivenessState();
    setScannerBooting(false);
    if (videoRef.current?.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach((track) => track.stop());
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setVideoReady(false);
    if (!options?.preserveStage) {
      livenessStageRef.current = "idle";
      setLivenessStage("idle");
    }
  };

  useEffect(() => {
    return () => {
      stopCamera();
      try { landmarkerRef.current?.close(); } catch { }
      landmarkerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (currentStep !== 2 && cameraActive) stopCamera();
  }, [currentStep, cameraActive]);

  useEffect(() => {
    if (currentStep !== 2) {
      autoScanStartedRef.current = false;
      return;
    }
    if (autoScanStartedRef.current || loadingRef.current) return;
    autoScanStartedRef.current = true;
    void startSelfieFlow();
  }, [currentStep]);

  const ensureSessionTokens = async (username?: string, password?: string) => {
    if (!username || !password) return false;
    savePendingCredentials(username, password);
    const tokens = await login({ username, password });
    saveTokens(tokens.access, tokens.refresh);
    try { await fetchMe(); } catch { }
    return true;
  };

  const handleProfileSubmit = async (values: ProfileFormValues) => {
    const directionChoice = Number(values.direction_choice);
    if (!Number.isFinite(directionChoice)) {
      message.error(t("register.directionRequired"));
      return;
    }
    const preparedProfile = {
      full_name: (values.full_name || "").trim(),
      phone: (values.phone || "").trim(),
      direction_choice: directionChoice,
    };

    try {
      setLoading(true);
      const res = await registerStart(preparedProfile);

      if (res.login_username && res.login_password) {
        savePendingCredentials(res.login_username, res.login_password);
      }
      if (res.access) {
        saveTokens(res.access, res.refresh);
        try { await fetchMe(); } catch { }
      } else if (res.login_username && res.login_password) {
        await ensureSessionTokens(res.login_username, res.login_password);
      }

      message.success(res.detail || t("register.profileSaved"));
      if (res.warning) message.warning(res.warning);
      setCurrentStep(1);
    } catch (error: unknown) {
      message.error(normalizeApiError(error, t("register.profileError")));
    } finally {
      setLoading(false);
    }
  };

  const handlePassportFileChange = (file: File) => {
    setPassportFile(file);
  };

  const handlePassportNext = () => {
    if (!passportFile) {
      message.warning(t("register.passportRequired"));
      return;
    }
    setCurrentStep(2);
  };

  const startCamera = async () => {
    try {
      stopAnalysis();
      if (videoRef.current?.srcObject) {
        const oldStream = videoRef.current.srcObject as MediaStream;
        oldStream.getTracks().forEach((track) => track.stop());
        videoRef.current.srcObject = null;
      }
      setCameraActive(false);
      setVideoReady(false);
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 }, aspectRatio: { ideal: 4 / 3 } },
        audio: false,
      });

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        if (videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0) {
          setVideoReady(true);
        } else {
          await new Promise<void>((resolve) => {
            const video = videoRef.current!;
            const onLoaded = () => { video.removeEventListener("loadeddata", onLoaded); resolve(); };
            video.addEventListener("loadeddata", onLoaded, { once: true });
            window.setTimeout(resolve, 1200);
          });
          setVideoReady(videoRef.current.videoWidth > 0 && videoRef.current.videoHeight > 0);
        }
      }

      setCameraActive(true);
      return true;
    } catch {
      message.error(t("register.cameraError"));
      return false;
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !canvasRef.current) return null;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const hasFrame = video.videoWidth > 0 && video.videoHeight > 0 && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA;
    if (!hasFrame) return null;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
    const arr = dataUrl.split(",");
    if (arr.length < 2) return null;

    const mime = arr[0].match(/:(.*?);/)?.[1] || "image/jpeg";
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) u8arr[n] = bstr.charCodeAt(n);

    return new File([u8arr], "selfie.jpg", { type: mime });
  };

  const submitRegistration = async (capturedSelfie: File) => {
    if (!passportFile) {
      setSubmissionInFlight(false);
      message.warning(t("register.passportRequired"));
      setCurrentStep(1);
      return;
    }

    setLoading(true);
    const retryDelays = [0, 800, 1600];
    let lastError: unknown = null;
    let keepPendingUi = false;

    try {
      for (let attempt = 0; attempt < retryDelays.length; attempt += 1) {
        if (attempt > 0) {
          setScannerNoticeSafe(t("register.retryingSubmit", { attempt: attempt + 1 }));
          await delay(retryDelays[attempt]);
        }
        try {
          const res = await registerFinalize({ passport_front: passportFile, selfie_image: capturedSelfie });
          if (res.login_username && res.login_password) {
            savePendingCredentials(res.login_username, res.login_password);
          }
          keepPendingUi = true;
          window.location.replace("/app/student/profile");
          return;
        } catch (error: any) {
          lastError = error;
        }
      }

      const errorText = t("register.submitFailedRetry");
      setScannerNoticeSafe(errorText);
      message.error(normalizeApiError(lastError, errorText));
      setStage("idle");
      setSelfieFile(null);
      setSelfiePreview(null);
      setScanFailed(true);
    } finally {
      if (!keepPendingUi) {
        setSubmissionInFlight(false);
        setLoading(false);
      }
    }
  };

  const finishSelfieFlow = async () => {
    const selfie = captureSelfie();
    if (!selfie) {
      setSubmissionInFlight(false);
      setScannerNoticeSafe(t("register.scanError"));
      setStage("idle");
      stopCamera();
      setScanFailed(true);
      return;
    }
    setSelfieFile(selfie);
    setSubmissionInFlight(true);
    setStage("done");
    setScannerNoticeSafe(t("register.submittingHint"));
    stopCamera({ preserveStage: true });
    await submitRegistration(selfie);
  };

  const analyzeLiveness = async () => {
    if (
      analysisBusyRef.current ||
      !videoRef.current ||
      !cameraActiveRef.current ||
      !videoReadyRef.current ||
      loadingRef.current
    ) return;

    analysisBusyRef.current = true;
    try {
      const video = videoRef.current;
      const stage = livenessStageRef.current;
      if (stage === "idle" || stage === "done" || stage === "capturing") return;

      const detector = landmarkerRef.current ?? (await ensureFaceLandmarker());
      const result = detector.detectForVideo(video, performance.now());
      const landmarks = result.faceLandmarks?.[0];

      if (!landmarks?.length) {
        stableFrameRef.current = 0;
        blinkClosedFramesRef.current = 0;
        setScannerNoticeSafe(t("register.faceNotDetected"));
        return;
      }

      const metrics = faceMetricsFromLandmarks(landmarks, result);
      if (!metrics) {
        stableFrameRef.current = 0;
        setScannerNoticeSafe(t("register.scanError"));
        return;
      }

      if (metrics.area < FACE_AREA_MIN) { stableFrameRef.current = 0; setScannerNoticeSafe(t("register.faceMoveCloser")); return; }
      if (metrics.area > FACE_AREA_MAX) { stableFrameRef.current = 0; setScannerNoticeSafe(t("register.faceMoveAway")); return; }
      if (Math.abs(metrics.roll) > ROLL_MAX_RAD) { stableFrameRef.current = 0; setScannerNoticeSafe(t("register.straightHead")); return; }

      const centeredStrict = Math.abs(metrics.cx - 0.5) <= ALIGN_CENTER_X_MAX && Math.abs(metrics.cy - 0.5) <= ALIGN_CENTER_Y_MAX;
      const centeredLoose = Math.abs(metrics.cx - 0.5) <= 0.2 && Math.abs(metrics.cy - 0.5) <= 0.22;
      const yaw = metrics.yaw * yawDirectionRef.current;
      const alignedForCapture = centeredStrict && Math.abs(yaw) <= ALIGN_YAW_MAX;

      if (stage === "align") {
        if (!alignedForCapture) { stableFrameRef.current = 0; setScannerNoticeSafe(t("register.holdStill")); return; }
        baselineEarRef.current =
          baselineEarRef.current === null ? metrics.ear : baselineEarRef.current * 0.88 + metrics.ear * 0.12;
        stableFrameRef.current += 1;
        setScannerNoticeSafe(t("register.holdStill"));
        if (stableFrameRef.current >= ALIGN_REQUIRED_FRAMES) { setStage("left"); setScannerNoticeSafe(t("register.lookLeftHint")); }
        return;
      }

      if (!centeredLoose) { stableFrameRef.current = 0; setScannerNoticeSafe(t("register.alignFaceHint")); return; }

      if (stage === "left") {
        if (yaw >= TURN_YAW_MIN) { yawDirectionRef.current = (yawDirectionRef.current * -1) as 1 | -1; stableFrameRef.current = 0; setScannerNoticeSafe(t("register.turnLeftMore")); return; }
        if (yaw <= -TURN_YAW_MIN) { stableFrameRef.current += 1; setScannerNoticeSafe(t("register.holdStill")); if (stableFrameRef.current >= TURN_REQUIRED_FRAMES) { setStage("right"); setScannerNoticeSafe(t("register.lookRightHint")); } }
        else { stableFrameRef.current = 0; setScannerNoticeSafe(t("register.turnLeftMore")); }
        return;
      }

      if (stage === "right") {
        if (yaw <= -TURN_YAW_MIN) { yawDirectionRef.current = (yawDirectionRef.current * -1) as 1 | -1; stableFrameRef.current = 0; setScannerNoticeSafe(t("register.turnRightMore")); return; }
        if (yaw >= TURN_YAW_MIN) { stableFrameRef.current += 1; setScannerNoticeSafe(t("register.holdStill")); if (stableFrameRef.current >= TURN_REQUIRED_FRAMES) { setStage("blink"); setScannerNoticeSafe(t("register.blinkPrompt")); } }
        else { stableFrameRef.current = 0; setScannerNoticeSafe(t("register.turnRightMore")); }
        return;
      }

      if (stage === "blink") {
        const baselineEar = baselineEarRef.current ?? metrics.ear;
        const closedByEar = metrics.ear <= baselineEar * BLINK_CLOSED_RATIO;
        const openedByEar = metrics.ear >= baselineEar * BLINK_OPEN_RATIO;
        const leftBlink = metrics.blinkLeft;
        const rightBlink = metrics.blinkRight;
        const closedByBlend = leftBlink !== null && rightBlink !== null && leftBlink > 0.45 && rightBlink > 0.45;
        const openedByBlend = leftBlink !== null && rightBlink !== null && leftBlink < 0.2 && rightBlink < 0.2;
        const eyesClosed = closedByBlend || closedByEar;
        const eyesOpened = openedByBlend || openedByEar;

        if (!blinkClosedRef.current) {
          if (eyesClosed) {
            blinkClosedFramesRef.current += 1;
            if (blinkClosedFramesRef.current >= BLINK_CLOSED_REQUIRED_FRAMES) {
              blinkClosedRef.current = true;
              setScannerNoticeSafe(t("register.blinkDetected"));
            }
          } else {
            blinkClosedFramesRef.current = 0;
            setScannerNoticeSafe(t("register.blinkPrompt"));
          }
          return;
        }

        if (!eyesOpened) { setScannerNoticeSafe(t("register.blinkPrompt")); return; }

        setStage("final");
        setScannerNoticeSafe(t("register.finalAlignHint"));
        return;
      }

      if (stage === "final") {
        const baselineEar = baselineEarRef.current ?? metrics.ear;
        const openedByEar = metrics.ear >= baselineEar * BLINK_OPEN_RATIO;
        const leftBlink = metrics.blinkLeft;
        const rightBlink = metrics.blinkRight;
        const openedByBlend = leftBlink !== null && rightBlink !== null && leftBlink < 0.2 && rightBlink < 0.2;
        const eyesOpened = openedByBlend || openedByEar;

        if (!alignedForCapture || !eyesOpened) {
          stableFrameRef.current = 0;
          setScannerNoticeSafe(t("register.finalAlignHint"));
          return;
        }

        stableFrameRef.current += 1;
        setScannerNoticeSafe(t("register.holdStill"));
        if (stableFrameRef.current >= FINAL_ALIGN_REQUIRED_FRAMES) {
          setStage("capturing");
          setScannerNoticeSafe(t("register.capturingHint"));
          stopAnalysis();
          await finishSelfieFlow();
        }
        return;
      }
    } catch {
      setScannerNoticeSafe(t("register.scanError"));
      stopAnalysis();
      stopCamera();
      setStage("idle");
      setScanFailed(true);
    } finally {
      analysisBusyRef.current = false;
    }
  };

  const startSelfieFlow = async () => {
    setScanFailed(false);
    setSubmissionInFlight(false);
    setScannerNoticeSafe(t("register.initializingScanner"));
    setScannerBooting(true);
    setSelfieFile(null);
    setSelfiePreview(null);
    resetLivenessState();
    setStage("idle");

    try {
      await ensureFaceLandmarker();
    } catch {
      setScannerBooting(false);
      autoScanStartedRef.current = false;
      setScannerNoticeSafe(t("register.scanError"));
      setScanFailed(true);
      return;
    }

    const started = await startCamera();
    if (!started) {
      setScannerBooting(false);
      autoScanStartedRef.current = false;
      setScanFailed(true);
      return;
    }

    setScannerBooting(false);
    setStage("align");
    setScannerNoticeSafe(null);

    if (analysisTimerRef.current) window.clearInterval(analysisTimerRef.current);
    analysisTimerRef.current = window.setInterval(() => { void analyzeLiveness(); }, ANALYZE_INTERVAL_MS);
  };

  const handleRetryScan = () => {
    autoScanStartedRef.current = false;
    setScanFailed(false);
    void startSelfieFlow();
  };

  /* ── Determine oval CSS state ──────────────────────────────── */
  const scannerFrameClass = [
    "scanner-frame",
    cameraActive ? "active" : "",
    livenessStage === "done" ? "done-state" : "",
  ].filter(Boolean).join(" ");
  const isSubmittingSelfie = submissionInFlight;
  const showInlineSelfiePreview = !cameraActive && Boolean(selfiePreview);
  const showScannerGuidance = (
    !scannerBooting &&
    !isSubmittingSelfie &&
    ["align", "left", "right", "blink", "final", "capturing"].includes(livenessStage) &&
    Boolean(livenessInstruction || scannerNotice)
  );

  return (
    <div className="registration-page">
      <div className="registration-container">
        {/* ── Brand header (mobile) ── */}
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-4)' }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 'var(--space-2)',
            color: 'var(--accent)', fontFamily: 'var(--font-heading)',
            fontWeight: 'var(--font-weight-bold)', fontSize: 'var(--font-size-lg)',
          }}>
            <BookOutlined />
            <span>MTP Platform</span>
          </div>
        </div>

        <Card
          className="wizard-card"
          title={<Typography.Title level={4} style={{ margin: 0 }}>{t("register.title")}</Typography.Title>}
          extra={<Link to="/login">{t("register.loginLink")}</Link>}
        >
          {/* ── Horizontal stepper ─────────────────────────────── */}
          <Steps
            current={currentStep}
            size={isMobileView ? "small" : "default"}
            items={stepTitles.map((title) => ({ title: isMobileView ? undefined : title }))}
            style={{ marginBottom: 'var(--space-5)' }}
          />

          {/* ── Step 0: Personal details ─────────────────────── */}
          {currentStep === 0 && (
            <Form
              form={form}
              layout="vertical"
              onFinish={handleProfileSubmit}
              onFinishFailed={({ errorFields }) => {
                const firstError = errorFields?.[0]?.errors?.[0];
                if (firstError) message.error(firstError);
              }}
              requiredMark={false}
            >
              <div className="wizard-grid">
                <Form.Item
                  label={t("register.fullName")}
                  name="full_name"
                  rules={[{ required: true, message: t("register.fullNameRequired") }]}
                >
                  <Input prefix={<UserOutlined />} placeholder={t("register.fullNamePlaceholder")} autoComplete="name" />
                </Form.Item>

                <Form.Item
                  label={t("register.direction")}
                  name="direction_choice"
                  rules={[{ required: true, message: t("register.directionRequired") }]}
                >
                  <Select
                    placeholder={directionsLoading ? t("common.loading") : t("register.directionPlaceholder")}
                    loading={directionsLoading}
                    options={directions.map((d) => ({ value: d.id, label: d.name }))}
                    style={{ width: '100%' }}
                  />
                </Form.Item>

                <Form.Item
                  label={t("register.phoneNumber")}
                  name="phone"
                  rules={[{ required: true, message: t("register.phoneRequired") }]}
                >
                  <Input prefix={<PhoneOutlined />} placeholder={t("register.phonePlaceholder")} autoComplete="tel" inputMode="tel" />
                </Form.Item>
              </div>

              <Button type="primary" htmlType="submit" block loading={loading} size="large" onClick={() => form.submit()}>
                {t("common.next")}
              </Button>
            </Form>
          )}

          {/* ── Step 1: Passport upload ──────────────────────── */}
          {currentStep === 1 && (
            <div className="wizard-step-body">
              <p className="wizard-text">{t("register.passportSubtitle")}</p>

              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handlePassportFileChange(file);
                }}
                className="hidden-file-input"
                id="passport-upload-input"
              />

              <label
                htmlFor="passport-upload-input"
                className={`passport-upload-zone ${passportFile ? "has-file" : ""}`}
              >
                <IdcardOutlined className="upload-zone-icon" />
                <span className="upload-zone-title">
                  {passportFile ? passportFile.name : t("register.passportUpload")}
                </span>
                <span className="upload-zone-hint">
                  {t("register.passportUploadHint")}
                </span>
              </label>

              {passportPreview && (
                <div className="preview-card">
                  <img src={passportPreview} alt="passport preview" loading="lazy" />
                </div>
              )}

              <div className="wizard-actions">
                <Button type="text" onClick={() => setCurrentStep(0)}>
                  {t("common.back")}
                </Button>
                <Button type="primary" onClick={handlePassportNext} loading={loading}>
                  {t("common.next")}
                </Button>
              </div>
            </div>
          )}


          {/* ── Step 2: Face scan ───────────────────────────── */}
          {currentStep === 2 && (
            <div className="wizard-step-body">
              <p className="wizard-text">{t("register.faceSubtitle")}</p>

              <div className="scanner-section">
                {/* Video frame */}
                <div className={scannerFrameClass}>
                  <div className="scanner-viewport-shell">
                    <div className="scanner-viewport">
                      <video
                        ref={videoRef}
                        className="scanner-video"
                        autoPlay
                        muted
                        playsInline
                        style={{ transform: "scaleX(-1)" }}
                        onLoadedMetadata={() => setVideoReady(true)}
                      />
                      {showInlineSelfiePreview && (
                        <img
                          src={selfiePreview ?? undefined}
                          className="scanner-video scanner-preview"
                          alt="selfie preview"
                          style={{ transform: "none" }}
                        />
                      )}
                    </div>
                  </div>
                  <canvas ref={canvasRef} className="scanner-canvas" />

                  {/* Placeholder when camera off */}
                  {!cameraActive && !selfiePreview && !scannerBooting && !isSubmittingSelfie && (
                    <div className="scanner-placeholder">
                      {t("register.startSelfieHint")}
                    </div>
                  )}

                  {/* Scan-line overlay + oval guide */}
                  <div className="scanner-overlay" />
                  {(cameraActive || scannerBooting || showInlineSelfiePreview) && <div className="scanner-oval" />}

                  {showScannerGuidance && (
                    <div className="scanner-guidance-overlay">
                      <div className="scanner-guidance-card">
                        {livenessInstruction && (
                          <div className="scanner-guidance-title">{livenessInstruction}</div>
                        )}
                        {scannerNotice && scannerNotice !== livenessInstruction && (
                          <div className="scanner-guidance-subtitle">{scannerNotice}</div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Booting spinner */}
                  {scannerBooting && (
                    <div className="scanner-booting-overlay">
                      <div className="scanner-spinner" />
                      <span>{t("register.initializingScanner")}</span>
                    </div>
                  )}

                  {/* Submitting overlay replaces large selfie preview */}
                  {isSubmittingSelfie && (
                    <div className="scanner-submitting-overlay">
                      <div className="scanner-spinner" />
                      <span>{t("register.submittingHint")}</span>
                    </div>
                  )}

                  {/* Done overlay */}
                  {livenessStage === "done" && selfieFile && !loading && (
                    <div className="scanner-done-overlay">
                      <CheckOutlined className="scanner-done-icon" />
                      <span>{t("register.faceVerified")}</span>
                    </div>
                  )}
                </div>

                {/* Retry button */}
                {scanFailed && !loading && livenessStage === "idle" && !cameraActive && (
                  <div className="scanner-retry">
                    <Button type="default" onClick={handleRetryScan} size="small">
                      {t("register.scanNow")}
                    </Button>
                  </div>
                )}

              </div>

              <div className="wizard-actions">
                <Button type="text" onClick={() => setCurrentStep(1)} disabled={loading}>
                  {t("common.back")}
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default RegisterPage;
