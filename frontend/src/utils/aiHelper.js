import * as tf from '@tensorflow/tfjs';

// Minimal prediction utility for Sketch recognition
// In production, the model.json is usually served from public/models/
export const predictSketch = async (canvas, model) => {
  if (!model) return null;

  // Convert canvas to tensor
  const tensor = tf.browser.fromPixels(canvas)
    .resizeBilinear([28, 28])
    .mean(2)
    .expandDims(0)
    .expandDims(-1)
    .div(255.0);

  const prediction = await model.predict(tensor).data();
  // returns an array of confidence levels for each class
  return prediction;
};

export const loadModel = async () => {
    // Note: The user would need to provide the actual binary model file, 
    // but we can point it to a standard quick-draw model JSON if hosted.
    // For now we'll return a placeholder to avoid breaking the build.
    try {
        // const model = await tf.loadLayersModel('/models/sketch_model.json');
        // return model;
        return null;
    } catch (e) {
        console.error("Failed to load AI model", e);
        return null;
    }
};
