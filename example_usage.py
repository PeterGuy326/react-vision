from openclip_loader import OpenCLIPLocalLoader
from PIL import Image
import numpy as np
import torch

def create_test_image():
    """创建一个测试图像"""
    # 创建一个简单的测试图像 (224x224 RGB)
    test_image = np.random.randint(0, 255, (224, 224, 3), dtype=np.uint8)
    return Image.fromarray(test_image)

def main():
    print("=== OpenCLIP 本地模型测试 ===")
    
    # 初始化加载器
    print("1. 初始化加载器...")
    loader = OpenCLIPLocalLoader(model_dir="./model")
    
    # 加载模型
    print("2. 加载模型...")
    success = loader.load_model()
    
    if not success:
        print("模型加载失败！")
        return
    
    print("3. 模型加载成功！")
    
    # 创建测试图像
    print("4. 创建测试图像...")
    test_image = create_test_image()
    
    # 定义测试文本
    texts = ["a cat", "a dog", "a car", "a person", "a building"]
    
    try:
        print("5. 进行预测...")
        # 获取预测结果
        similarities, probabilities = loader.predict(test_image, texts)
        
        print("\n=== 预测结果 ===")
        for i, (text, prob) in enumerate(zip(texts, probabilities)):
            print(f"{text}: {prob:.4f} ({prob*100:.2f}%)")
        
        # 显示最匹配的文本
        best_match_idx = np.argmax(probabilities)
        print(f"\n最佳匹配: {texts[best_match_idx]} (概率: {probabilities[best_match_idx]:.4f})")
        
    except Exception as e:
        print(f"预测过程中出现错误: {e}")
        print("这可能是因为模型权重文件格式或架构不匹配")
        
        # 尝试单独测试编码功能
        print("\n尝试单独测试编码功能...")
        try:
            print("测试文本编码...")
            text_features = loader.encode_text(["test text"])
            print(f"文本特征形状: {text_features.shape}")
            
            print("测试图像编码...")
            image_features = loader.encode_image(test_image)
            print(f"图像特征形状: {image_features.shape}")
            
        except Exception as e2:
            print(f"编码测试也失败: {e2}")

if __name__ == "__main__":
    main()