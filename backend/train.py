import os
os.environ.setdefault("OMP_NUM_THREADS", "1")
os.environ.setdefault("OPENBLAS_NUM_THREADS", "1")
os.environ.setdefault("MKL_NUM_THREADS", "1")

import pandas as pd
import ml_pipeline

DATASET_PATH = "academic_esg_dataset.csv"

if __name__ == "__main__":
    print(f"Loading dataset: {DATASET_PATH}")
    df = pd.read_csv(DATASET_PATH)
    df = df.sort_values(["country", "year"]).reset_index(drop=True)
    print(f"Loaded: {df.shape[0]:,} rows, {df.shape[1]} columns", flush=True)
    ml_pipeline.train_models(df)
    print("ALL DONE", flush=True)
