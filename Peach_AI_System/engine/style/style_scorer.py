# style/style_scorer.py

from style.style_bank import STYLE_BANK

def score_style(tags, target_style="luxury_minimal"):
    """
    计算当前图像风格 vs 目标风格匹配度
    """

    target = STYLE_BANK[target_style]["tags"]

    if not tags:
        return 0.0

    match = 0
    for t in tags:
        if t in target:
            match += 1

    return match / len(target)