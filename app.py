from flask import Flask, render_template, jsonify, send_from_directory
import os

app = Flask(__name__)

# 配置视频目录
VIDEO_DIR = os.path.join(os.getcwd(), 'videos')

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/videos')
def get_videos():
    """获取视频列表"""
    try:
        videos = [f for f in os.listdir(VIDEO_DIR) if f.endswith(('.mp4', '.avi', '.mkv', '.mov'))]
        return jsonify({'videos': videos})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/video/<filename>')
def serve_video(filename):
    """提供视频文件服务"""
    return send_from_directory(VIDEO_DIR, filename)

@app.route('/static/<path:filename>')
def serve_static(filename):
    """提供静态文件服务"""
    return send_from_directory('static', filename)

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5001)
