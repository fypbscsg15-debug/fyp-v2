import os
os.environ["PADDLE_PDX_DISABLE_MODEL_SOURCE_CHECK"] = "True"
os.environ["PADDLE_PDX_ENABLE_MKLDNN_BYDEFAULT"] = "0"
os.environ["FLAGS_use_onednn"] = "0"

import cv2
import numpy as np
from paddleocr import PaddleOCR

# Initialize OCR model once when module is imported
ocr = PaddleOCR(use_angle_cls=True, lang="en", enable_mkldnn=False)


async def run_ocr(image_bytes: bytes, filename: str) -> dict:
    # Convert image bytes to numpy array
    np_arr = np.frombuffer(image_bytes, np.uint8)
    image = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

    if image is None:
        raise ValueError("Invalid image format or empty image")

    # Run PaddleOCR directly
    result = ocr.ocr(image)
    extracted = []

    if result and result[0] is not None:
        res = result[0]
        # Check if result is in new PaddleOCR 3.x / PaddleX dictionary-like format
        is_dict_like = isinstance(res, dict) or hasattr(res, "get") or (hasattr(res, "__getitem__") and "rec_texts" in res)
        if is_dict_like:
            texts = res.get("rec_texts", []) if hasattr(res, "get") else res["rec_texts"]
            scores = res.get("rec_scores", []) if hasattr(res, "get") else res["rec_scores"]
            for text, conf in zip(texts, scores):
                extracted.append({
                    "text": str(text),
                    "confidence": float(conf)
                })
        else:
            # Fallback for older PaddleOCR list-based format: [[box, (text, score)], ...]
            for line in res:
                if line and len(line) >= 2 and isinstance(line[1], (list, tuple)) and len(line[1]) >= 2:
                    extracted.append({
                        "text": str(line[1][0]),
                        "confidence": float(line[1][1])
                    })

    return {
        "filename": filename,
        "text_count": len(extracted),
        "results": extracted
    }
