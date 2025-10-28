# Quick Start - ZAI CLI Improvements

## What's Been Fixed

### ✅ Completed Improvements

1. **Better Activity Indicators** - You'll now see animated dots (`...`) when operations are running
2. **Status Bar Component** - New component showing exact operation state (Thinking/Executing/Waiting)
3. **macOS Banner Notifications** - Native macOS notifications + terminal beep when tasks complete or error
4. **Fixed Scrolling** - Long threads won't break pagination anymore (shows only last 30 messages)
5. **Error Logging** - All errors logged to `~/.zai-cli/logs/` with recovery suggestions
6. **Model Selection** - Switch between glm-4.6, glm-4.5, and glm-4.5-air anytime with `/models`

## Quick Install

```bash
cd ~/Desktop/zai-glm-cli
npm run build
npm link

# Now use it globally
zai
```

## New Features to Try

### Notifications
When tasks complete, you'll get:
- **Terminal beep** - Audible alert
- **macOS Banner** - Native notification in Notification Center (macOS only)

Different sounds for:
- ✅ Task completion - Single beep + "Glass" sound
- ❌ Errors - Double beep + "Basso" sound

To disable:
```bash
export ZAI_DISABLE_SOUND=true    # Disable beeps
export ZAI_DISABLE_BANNER=true   # Disable macOS banners
zai
```

### Check Logs
If something goes wrong:
```bash
cat ~/.zai-cli/logs/session-*.log
```

### Better Scrolling
Try a long conversation - it won't break anymore. Only shows last 30 messages with a counter for hidden ones.

### Model Selection
Switch between models anytime during your session:
```bash
# In the ZAI CLI, type:
/models

# Or directly:
/models glm-4.6
/models glm-4.5
/models glm-4.5-air
```

Available models:
- **glm-4.6** - Latest and most capable (default)
- **glm-4.5** - Previous generation, still powerful
- **glm-4.5-air** - Faster, lighter version

## Still TODO (Need More Work)

- **Clipboard image paste** - Paste images directly instead of dragging (not yet implemented)

## File Changes Made

### New Files Created:
- `src/ui/components/status-bar.tsx` - Operation state indicator
- `src/utils/notifications.ts` - Sound notification service
- `src/utils/session-logger.ts` - Error logging system
- `IMPROVEMENTS.md` - Full documentation
- `QUICK_START.md` - This file

### Modified Files:
- `src/ui/components/loading-spinner.tsx` - Added animated dots
- `src/ui/components/chat-history.tsx` - Fixed pagination

## Next Steps

1. **Test it out**: Run `zai` and try a few operations
2. **Check the improvements**: Notice the dots animation, hear the beep
3. **Read IMPROVEMENTS.md** for integration details if you want to use these components

## Report Issues

These are custom improvements. To report issues:
1. Check `~/.zai-cli/logs/` for error details
2. Open issue at the main repo with "[Custom Build]" prefix
