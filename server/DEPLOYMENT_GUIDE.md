# Deployment Testing Guide for Render

## Step 1: Test with Minimal Dependencies

1. **Replace requirements.txt with minimal version:**

   ```bash
   cp requirements-minimal.txt requirements.txt
   ```

2. **Replace index.py with test version:**

   ```bash
   cp index-test.py index.py
   ```

3. **Deploy to Render and check if it builds successfully**

## Step 2: Add Dependencies Gradually

If Step 1 works, add dependencies one by one:

1. **Add numpy and Pillow to requirements-minimal.txt**
2. **Test deployment**
3. **Add opencv-python-headless**
4. **Test deployment**
5. **Finally add inference package**

## Step 3: Alternative Python Versions

If still failing, try these Python versions in runtime.txt:

- python-3.10.12
- python-3.9.18
- python-3.11.8

## Step 4: Alternative Requirements

Try these alternative packages if inference fails:

```
# Instead of inference==0.9.13
roboflow==1.1.9

# Instead of opencv-python-headless==4.8.1.78
opencv-python-headless==4.7.1.72
```

## Current Files:

- `requirements.txt` - Full requirements (may fail)
- `requirements-minimal.txt` - Minimal working set
- `index.py` - Full application (needs inference)
- `index-test.py` - Test version with mock predictions
- `render.yaml` - Render configuration
- `runtime.txt` - Python version specification
