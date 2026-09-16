from pathlib import Path
import subprocess
import sys


BASE_DIR = Path(__file__).resolve().parent


def run_script(script_name):
    print("\n" + "=" * 70)
    print(f"RUNNING: {script_name}")
    print("=" * 70)

    result = subprocess.run(
        [sys.executable, str(BASE_DIR / script_name)],
        cwd=BASE_DIR.parent
    )

    if result.returncode != 0:
        print(f"\nFAILED: {script_name}")
        sys.exit(result.returncode)

    print(f"\nCOMPLETED: {script_name}")


def main():

    print("=" * 70)
    print("AGRICULTURE DATA CLEANING PIPELINE")
    print("=" * 70)

    # --------------------------------------------------------
    # CLEANING
    # --------------------------------------------------------

    cleaning_scripts = [
        "clean_master.py",
        "clean_arrivals.py",
        "clean_prices.py",
        "clean_transport.py",
        "clean_weather.py",
    ]

    for script in cleaning_scripts:
        run_script(script)

    # --------------------------------------------------------
    # VALIDATION
    # --------------------------------------------------------

    validation_scripts = [
        "validate_master.py",
        "validate_arrivals.py",
        "validate_prices.py",
        "validate_transport.py",
        "validate_weather.py",
        "validate_relationships.py",
        "validate_business_rules.py",
    ]

    for script in validation_scripts:
        run_script(script)

    # --------------------------------------------------------
    # QUALITY REPORT
    # --------------------------------------------------------

    run_script("generate_quality_report.py")

    print("\n" + "=" * 70)
    print("PIPELINE COMPLETED SUCCESSFULLY")
    print("=" * 70)
    print("\nAll cleaning, validation and quality-report steps completed.")


if __name__ == "__main__":
    main()