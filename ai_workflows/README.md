# AI Workflows for Ableton Rack Analysis

This directory contains scripts and utilities for integrating Ableton rack data with AI workflows, specifically using FlowiseAI.

## Setup

### 1. Deploy FlowiseAI on Railway

1. Go to the [FlowiseAI with Workers template](https://railway.app/template/pn4G8S)
2. Click "Deploy on Railway"
3. Configure the environment variables:
   - Set a secure `FLOWISE_USERNAME` and `FLOWISE_PASSWORD`
   - Note the generated URL for your FlowiseAI instance

### 2. Install Dependencies

```bash
pip install requests numpy
```

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```bash
FLOWISE_API_URL=https://your-flowise-instance.railway.app
FLOWISE_API_KEY=your-api-key-if-configured
```

## Usage

### Preparing Rack Data

The `prepare_rack_data.py` script processes your Ableton rack files and extracts features for AI training:

```bash
# Process all racks in a directory
python ai_workflows/scripts/prepare_rack_data.py /path/to/rack/files

# Process and create train/validation splits
python ai_workflows/scripts/prepare_rack_data.py /path/to/rack/files --split

# Specify custom output directory
python ai_workflows/scripts/prepare_rack_data.py /path/to/rack/files --output-dir custom/output
```

This will create a `rack_dataset.json` file containing:
- Extracted features from each rack (macros, chains, devices)
- Metadata for searching and filtering
- Error logs for any failed processing

### Integrating with FlowiseAI

The `flowise_integration.py` script provides tools to:

1. **Create AI Workflows**: Set up chatflows for rack analysis
2. **Upload Data**: Send your rack data to FlowiseAI for processing
3. **Query Insights**: Ask questions about your rack collection

```python
from ai_workflows.scripts.flowise_integration import FlowiseAIClient, RackDataFlowiseAdapter

# Initialize client
client = FlowiseAIClient()
adapter = RackDataFlowiseAdapter(client)

# Create a chatflow for rack analysis
chatflow = adapter.create_rack_analysis_chatflow()

# Upload your rack dataset
results = adapter.upload_rack_dataset("ai_workflows/data/rack_dataset.json")

# Query for insights
response = adapter.query_rack_insights(
    chatflow['id'], 
    "What are the most common macro configurations?"
)
```

## AI Workflow Examples

### 1. Rack Pattern Analysis
- Identify common device combinations
- Find similar racks based on structure
- Suggest macro naming conventions

### 2. Rack Optimization
- Recommend device order improvements
- Identify redundant chains
- Suggest parameter optimizations

### 3. Rack Generation
- Generate new rack ideas based on existing patterns
- Create variations of successful racks
- Suggest macro mappings

## Data Structure

The processed rack data includes:

```json
{
  "rack_name": "Bass Wobble",
  "num_macros": 8,
  "num_chains": 3,
  "total_devices": 12,
  "device_types": ["EQ Eight", "Compressor", "Reverb"],
  "macro_names": ["Cutoff", "Resonance", "Drive", ...],
  "macro_values": [0.5, 0.3, 0.7, ...],
  "chain_names": ["Low", "Mid", "High"],
  "device_type_counts": {
    "EQ Eight": 3,
    "Compressor": 2,
    "Reverb": 1
  }
}
```

## Next Steps

1. **Deploy FlowiseAI**: Get your instance running on Railway
2. **Process Your Racks**: Run the data preparation script on your rack collection
3. **Create Workflows**: Design custom AI workflows in FlowiseAI UI
4. **Train Models**: Use the processed data to train specialized models
5. **Build Applications**: Create tools that leverage AI insights about your racks

## Advanced Usage

### Custom Feature Extraction

Modify `extract_features()` in `prepare_rack_data.py` to add custom features:

```python
def extract_features(self, rack_data):
    features = super().extract_features(rack_data)
    
    # Add custom features
    features["has_sidechain"] = self.detect_sidechain(rack_data)
    features["complexity_score"] = self.calculate_complexity(rack_data)
    
    return features
```

### Batch Processing

For large collections, use batch processing:

```bash
# Process in parallel
find /path/to/racks -name "*.adg" | parallel -j 4 python process_single_rack.py {}
```

### Integration with Your Backend

Connect the AI insights to your existing Flask backend:

```python
# In your Flask app
@app.route('/api/rack/<rack_id>/ai-insights')
@jwt_required()
def get_ai_insights(rack_id):
    rack_data = db.get_rack(rack_id)
    insights = flowise_adapter.get_rack_insights(rack_data)
    return jsonify(insights)
```
