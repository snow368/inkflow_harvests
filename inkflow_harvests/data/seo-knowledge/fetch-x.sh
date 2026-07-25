#!/bin/bash
# X/Twitter 快速抓取工具
# 用法: bash fetch-x.sh <tweet_url>
# 示例: bash fetch-x.sh https://x.com/username/status/123456

URL="$1"

if [[ -z "$URL" ]]; then
    echo "❌ 用法: fetch-x.sh <tweet_url>"
    exit 1
fi

# 提取用户名和推文ID
if [[ "$URL" =~ x\.com/([^/]+)/status/([0-9]+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    TWEET_ID="${BASH_REMATCH[2]}"
elif [[ "$URL" =~ twitter\.com/([^/]+)/status/([0-9]+) ]]; then
    USERNAME="${BASH_REMATCH[1]}"
    TWEET_ID="${BASH_REMATCH[2]}"
else
    echo "❌ 无法解析链接: $URL"
    exit 1
fi

echo "🔍 抓取 @$USERNAME 的推文 $TWEET_ID ..."

# 用 vxtwitter API 抓取
RESULT=$(curl -s "https://api.vxtwitter.com/$USERNAME/status/$TWEET_ID" 2>&1)

# 检查是否返回有效 JSON
if echo "$RESULT" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('user_name','')+' (@'+d.get('user_screen_name','')+')'); print('---'); print(d.get('text','')[:500]);" 2>/dev/null; then
    echo ""
    echo "--- 媒体内容 ---"
    echo "$RESULT" | python3 -c "
import json,sys
d=json.load(sys.stdin)
likes=d.get('likes',0)
rt=d.get('retweets',0)
replies=d.get('replies',0)
print(f'❤️ {likes}  🔁 {rt}  💬 {replies}')
if d.get('article'):
    print(f'📄 文章: {d[\"article\"].get(\"title\",\"\")}')
    print(f'📝 预览: {d[\"article\"].get(\"preview_text\",\"\")[:300]}')
" 2>/dev/null
else
    echo "❌ 获取失败或返回空"
    echo "$RESULT" | head -3
fi
