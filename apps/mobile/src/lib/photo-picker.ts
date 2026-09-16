import * as ImagePicker from "expo-image-picker";

const maxImageDataUrlLength = 1_500_000;

export async function pickPhotoDataUrl() {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) throw new Error("사진을 선택하려면 사진 접근을 허용해주세요.");

  const result = await ImagePicker.launchImageLibraryAsync({
    allowsEditing: true,
    aspect: [1, 1],
    base64: true,
    mediaTypes: ["images"],
    quality: 0.35,
  });
  if (result.canceled) return null;

  const asset = result.assets[0];
  if (!asset?.base64) throw new Error("선택한 사진을 읽지 못했습니다.");
  const dataUrl = `data:${asset.mimeType ?? "image/jpeg"};base64,${asset.base64}`;
  if (dataUrl.length > maxImageDataUrlLength) {
    throw new Error("사진 용량이 너무 커요. 더 작은 사진을 선택해주세요.");
  }
  return dataUrl;
}
