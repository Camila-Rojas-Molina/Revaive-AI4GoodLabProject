RISK_FEATURES = {
    "anchor_age": "int",
    "gender": "binary",              # "F" or "M"
    "admission_type": "categorical", # "ELECTIVE", "EW EMER.", "URGENT", "DIRECT EMER.", "SURGICAL SAME DAY ADMISSION"
    "prior_delirium": "binary",      # 0 or 1
    "dementia": "binary",            # 0 or 1
    "curr_service": "categorical",  # clinical service code (CMED, CSURG, MED, etc.); see SERVICE_MAP in predict.py
}