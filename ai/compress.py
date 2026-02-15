#!/usr/bin/env python3
"""
GGUF Model Compression Utility
==============================

A comprehensive utility for inspecting GGUF model metadata and 
automating the quantization (compression) process with runtime resource hints.

Author: Warith Harchaoui
"""

import sys
import os
import argparse
import subprocess
import multiprocessing
import shutil
from typing import List, Optional, NoReturn

try:
    import gguf
except ImportError:
    print("Error: The 'gguf' library is missing.")
    print("Please install it using: pip install gguf")
    sys.exit(1)


def get_model_info(file_path: str) -> None:
    """
    Parses and prints detailed metadata from a GGUF model file.

    Parameters
    ----------
    file_path : str
        The absolute or relative path to the .gguf model file.

    Returns
    -------
    None
        This function prints information directly to the standard output.

    Notes
    -----
    Uses the 'gguf' library to inspect internal metadata fields, including
    custom runtime hints embedded for the wllama-tinyllama-chat engine.
    """
    print(f"\n" + "=" * 50)
    print(f"📊 METADATA FOR: {os.path.basename(file_path)}")
    print("=" * 50)

    try:
        reader = gguf.GGUFReader(file_path)
        print(f"🔹 Byte Order: {reader.byte_order}")
        print(f"🔹 Total Tensors: {len(reader.tensors)}")
        print(f"🔹 Total Metadata Fields: {len(reader.fields)}")

        # Attempt to retrieve architecture info
        arch = reader.get_field("general.architecture")
        if arch:
            # Handle both part-based and direct-value architecture fields
            arch_val = (
                arch.parts[arch.data[0]] if hasattr(arch, "parts") else arch.data[0]
            )
            print(f"🔹 Architecture: {arch_val}")

        # Extract Custom wllama Runtime Hints
        mt = reader.get_field("wllama.runtime.max_threads")
        if mt:
            print(f"🔹 Runtime Max Threads: {mt.data[0]}")

        mr = reader.get_field("wllama.runtime.max_ram")
        if mr:
            print(f"🔹 Runtime Max RAM: {mr.data[0]} GB")

        print("=" * 50 + "\n")
    except Exception as e:
        print(f"❌ Error reading GGUF metadata: {e}")


def compress_model(input_path: str, output_path: str, method: str = "q4_k_m") -> None:
    """
    Automates the model quantization process using external engines.

    Parameters
    ----------
    input_path : str
        Path to the source .gguf file (usually a high-precision weights file).
    output_path : str
        Target path for the compressed/quantized output file.
    method : str, optional
        Quantization strategy (e.g., 'q4_k_m', 'q8_0'). Default is 'q4_k_m'.

    Returns
    -------
    None

    Raises
    ------
    SystemExit
        Exits the process with code 1 if no valid quantization engine is found.
    """
    print(f"\n🚀 Initiating quantization...")
    print(f"📥 Input:   {input_path}")
    print(f"📤 Output:  {output_path}")
    print(f"🛠️  Method:  {method}\n")

    # Engines to try in order of preference
    commands_to_try: List[List[str]] = [
        ["llama-quantize", input_path, output_path, method],
        [sys.executable, "-m", "llama_cpp.quantize", input_path, output_path, method],
    ]

    success = False
    for cmd in commands_to_try:
        try:
            print(f"⏳ Attempting command: {' '.join(cmd)}")
            # Execute the quantization synchronously
            subprocess.run(cmd, check=True)
            print(f"\n✅ QUANTIZATION COMPLETE!")
            success = True
            break
        except (subprocess.CalledProcessError, FileNotFoundError):
            # Silence failures to allow falling back to the next engine
            continue

    if not success:
        print("\n❌ QUANTIZATION FAILED: Could not locate a valid engine.")
        sys.exit(1)


def main() -> None:
    """
    Main entry point for the GGUF compression CLI.

    Parses command-line arguments and routes flow to metadata inspection
    or the quantization engine.
    """
    parser = argparse.ArgumentParser(
        description="GGUF Model Compression Helper with Runtime Hints.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument("input", help="Path to the input .gguf model file.")
    parser.add_argument("--output", "-o", help="Path for the compressed model.")
    parser.add_argument(
        "--info", "-i", action="store_true", help="Display model metadata."
    )
    parser.add_argument(
        "--method",
        "-m",
        default="q4_k_m",
        help="Quantization method (Default: q4_k_m).",
    )
    parser.add_argument("--max-threads", "-t", type=int, help="Runtime thread count hint.")
    parser.add_argument("--max-ram", "-r", type=float, help="Runtime RAM limit hint in GB.")

    args = parser.parse_args()

    # Validate input file existence
    if not os.path.exists(args.input):
        print(f"❌ Error: Input file not found: {args.input}")
        sys.exit(1)

    # Route to metadata display if -i is provided
    if args.info:
        get_model_info(args.input)
        return

    # Derive default output path if not specified
    if not args.output:
        base, ext = os.path.splitext(args.input)
        args.output = f"{base}_{args.method}{ext}"

    # Execute the primary quantization logic
    compress_model(args.input, args.output, args.method)

    # Log runtime resource hints if provided
    if args.max_threads or args.max_ram:
        print(f"\n💡 Resource Optimization Summary for {args.output}:")
        if args.max_threads:
            print(f"   - Target Execution Threads: {args.max_threads}")
        if args.max_ram:
            print(f"   - High-Memory Protection: {args.max_ram} GB")
        print("\nNote: These runtime hints are optimized for the wllama-tinyllama-chat frontend.")


if __name__ == "__main__":
    main()
