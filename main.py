from flask import Flask, request, jsonify
from flask_cors import CORS
from PIL import Image
import io
import base64
import os
import json
from openclip_loader import OpenCLIPLocalLoader

app = Flask(__name__)
CORS(app)  # 允许跨域请求

# 初始化模型加载器
loader = OpenCLIPLocalLoader(model_dir="./model")
model_loaded = loader.load_model()

@app.route('/api/analyze', methods=['POST'])
def analyze_image():
    if not model_loaded:
        return jsonify({'error': '模型未加载成功'}), 500
    
    try:
        # 获取上传的图像和文本
        image_file = request.files.get('image')
        texts = request.form.get('texts')
        
        if not image_file or not texts:
            return jsonify({'error': '缺少图像或文本参数'}), 400
        
        # 解析文本列表
        import json
        text_list = json.loads(texts)
        
        # 处理图像
        image = Image.open(image_file.stream).convert('RGB')
        
        # 使用模型进行预测
        similarities, probabilities = loader.predict(image, text_list)
        
        # 准备结果
        results = []
        for i, (text, prob) in enumerate(zip(text_list, probabilities)):
            results.append({
                'text': text,
                'similarity': float(similarities[0][i]),
                'probability': float(prob)
            })
        
        # 按概率排序
        results.sort(key=lambda x: x['probability'], reverse=True)
        
        return jsonify({'results': results})
        
    except Exception as e:
        return jsonify({'error': f'处理失败: {str(e)}'}), 500

@app.route('/api/search_images', methods=['POST'])
def search_images():
    """根据文本描述搜索图片集合"""
    if not model_loaded:
        return jsonify({'error': '模型未加载成功'}), 500
    
    try:
        # 获取文本描述
        text_query = request.form.get('text_query')
        if not text_query:
            return jsonify({'error': '缺少文本查询参数'}), 400
        
        # 获取上传的图片文件列表
        image_files = request.files.getlist('images')
        if not image_files:
            return jsonify({'error': '请至少上传一张图片'}), 400
        
        # 处理每张图片并计算相似度
        results = []
        for i, image_file in enumerate(image_files):
            try:
                # 处理图像
                image = Image.open(image_file.stream).convert('RGB')
                
                # 使用模型计算相似度
                similarities, probabilities = loader.predict(image, [text_query])
                
                # 将图片转换为base64用于前端显示
                image_file.stream.seek(0)  # 重置文件指针
                image_data = image_file.stream.read()
                image_base64 = base64.b64encode(image_data).decode('utf-8')
                
                results.append({
                    'image_index': i,
                    'image_name': image_file.filename,
                    'image_data': f"data:image/jpeg;base64,{image_base64}",
                    'similarity': float(similarities[0][0]),
                    'probability': float(probabilities[0])
                })
                
            except Exception as e:
                print(f"处理图片 {image_file.filename} 时出错: {e}")
                continue
        
        # 按相似度排序
        results.sort(key=lambda x: x['similarity'], reverse=True)
        
        return jsonify({
            'query': text_query,
            'total_images': len(image_files),
            'processed_images': len(results),
            'results': results
        })
        
    except Exception as e:
        return jsonify({'error': f'搜索失败: {str(e)}'}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'ok',
        'model_loaded': model_loaded
    })

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=8000)