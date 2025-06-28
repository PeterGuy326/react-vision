import json
import torch
import open_clip
from PIL import Image
import torchvision.transforms as transforms
from pathlib import Path
from typing import Union, List, Tuple
from safetensors.torch import load_file  # 添加这行

class OpenCLIPLocalLoader:
    def __init__(self, model_dir: str = "./model"):
        """
        初始化OpenCLIP本地模型加载器
        
        Args:
            model_dir: 模型文件所在目录路径
        """
        self.model_dir = Path(model_dir)
        self.config_path = self.model_dir / "open_clip_config.json"
        self.model_path = self.model_dir / "open_clip_model.safetensors"
        
        # 加载配置
        self.config = self._load_config()
        
        # 初始化模型和预处理
        self.model = None
        self.tokenizer = None
        self.preprocess = None
        self.device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        
    def _load_config(self) -> dict:
        """加载模型配置文件"""
        with open(self.config_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    
    def _create_preprocess(self):
        """根据配置创建图像预处理管道"""
        preprocess_cfg = self.config["preprocess_cfg"]
        vision_cfg = self.config["model_cfg"]["vision_cfg"]
        
        return transforms.Compose([
            transforms.Resize((vision_cfg["image_size"], vision_cfg["image_size"])),
            transforms.ToTensor(),
            transforms.Normalize(
                mean=preprocess_cfg["mean"],
                std=preprocess_cfg["std"]
            )
        ])
    
    def load_model(self):
        """加载本地模型"""
        try:
            # 创建模型架构
            model_cfg = self.config["model_cfg"]
            
            # 使用open_clip创建模型（这里需要根据实际的模型架构调整）
            # 由于是自定义配置，我们需要手动构建模型
            self.model = open_clip.create_model(
                model_name="ViT-B-32",  # 根据配置推断的架构
                pretrained=None,  # 不使用预训练权重
                device=self.device
            )
            
            # 加载本地权重 - 使用safetensors加载.safetensors文件
            if self.model_path.exists():
                try:
                    # 使用safetensors加载.safetensors格式文件
                    state_dict = load_file(str(self.model_path), device=str(self.device))
                    print(f"使用safetensors成功加载模型权重: {self.model_path}")
                except Exception as e:
                    print(f"safetensors加载失败，尝试torch.load: {e}")
                    # 如果safetensors失败，尝试torch.load
                    state_dict = torch.load(self.model_path, map_location=self.device, weights_only=False)
                
                self.model.load_state_dict(state_dict)
                print(f"成功加载本地模型权重: {self.model_path}")
            else:
                print(f"警告: 模型文件不存在 {self.model_path}")
            
            # 创建tokenizer
            self.tokenizer = open_clip.get_tokenizer("ViT-B-32")
            
            # 创建预处理管道
            self.preprocess = self._create_preprocess()
            
            # 设置为评估模式
            self.model.eval()
            
            print("模型加载完成！")
            return True
            
        except Exception as e:
            print(f"模型加载失败: {e}")
            return False
    
    def encode_image(self, image: Union[str, Image.Image, torch.Tensor]) -> torch.Tensor:
        """编码图像为特征向量"""
        if self.model is None:
            raise RuntimeError("模型未加载，请先调用 load_model()")
        
        # 处理不同类型的输入
        if isinstance(image, str):
            image = Image.open(image).convert('RGB')
        elif isinstance(image, torch.Tensor):
            if image.dim() == 3:
                image = image.unsqueeze(0)
        else:
            # PIL Image
            pass
        
        # 预处理图像
        if not isinstance(image, torch.Tensor):
            image = self.preprocess(image).unsqueeze(0)
        
        image = image.to(self.device)
        
        with torch.no_grad():
            image_features = self.model.encode_image(image)
            image_features = image_features / image_features.norm(dim=-1, keepdim=True)
        
        return image_features
    
    def encode_text(self, texts: Union[str, List[str]]) -> torch.Tensor:
        """编码文本为特征向量"""
        if self.model is None:
            raise RuntimeError("模型未加载，请先调用 load_model()")
        
        if isinstance(texts, str):
            texts = [texts]
        
        # 分词
        text_tokens = self.tokenizer(texts).to(self.device)
        
        with torch.no_grad():
            text_features = self.model.encode_text(text_tokens)
            text_features = text_features / text_features.norm(dim=-1, keepdim=True)
        
        return text_features
    
    def compute_similarity(self, image_features: torch.Tensor, text_features: torch.Tensor) -> torch.Tensor:
        """计算图像和文本特征的相似度"""
        return (image_features @ text_features.T)
    
    def predict(self, image: Union[str, Image.Image], texts: List[str]) -> Tuple[torch.Tensor, List[float]]:
        """预测图像与文本的匹配度"""
        # 编码图像和文本
        image_features = self.encode_image(image)
        text_features = self.encode_text(texts)
        
        # 计算相似度
        similarities = self.compute_similarity(image_features, text_features)
        
        # 应用softmax获得概率
        probs = torch.softmax(similarities * 100, dim=-1)
        
        return similarities, probs.cpu().numpy().tolist()[0]

# 使用示例
def main():
    # 初始化加载器
    loader = OpenCLIPLocalLoader(model_dir="./model")
    
    # 加载模型
    if loader.load_model():
        print("模型加载成功！")
        
        # 示例：图像-文本匹配
        # image_path = "your_image.jpg"
        # texts = ["一只猫", "一只狗", "一辆汽车"]
        # similarities, probs = loader.predict(image_path, texts)
        # 
        # for i, (text, prob) in enumerate(zip(texts, probs)):
        #     print(f"{text}: {prob:.4f}")
    else:
        print("模型加载失败！")

if __name__ == "__main__":
    main()