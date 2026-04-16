"use client";

import { useEffect, useMemo, useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import * as yup from "yup";
import { useBidsControllerCreateMutation, useBidsControllerUploadAttachmentsMutation } from "@/lib/api";
import { getApiErrorMessage } from "@/lib/getApiErrorMessage";

type BidAttachment = {
  fileName: string;
  type: "photo" | "video" | "pdf" | "word";
  url: string;
  sizeMb: number;
};

type BidModule = {
  title: string;
  details: string;
  amount: number;
};

type BidApplicationFormValues = {
  bidAmount: number;
  coverLetter: string;
  payoutType: "whole" | "module_based";
};

type BidApplicationFormProps = {
  taskId: string;
  defaultBidAmount: number;
};

type ModuleDraft = {
  title: string;
  details: string;
  amount: string;
};

const bidApplicationSchema: yup.ObjectSchema<BidApplicationFormValues> = yup
  .object({
    bidAmount: yup.number().typeError("Bid amount must be a number").required("Bid amount is required").positive("Bid amount must be greater than zero"),
    coverLetter: yup.string().trim().required("Cover letter is required").min(50, "Cover letter must be at least 50 characters"),
    payoutType: yup.mixed<"whole" | "module_based">().oneOf(["whole", "module_based"]).required("Bid type is required"),
  })
  .required();

const createEmptyModule = (): ModuleDraft => ({ title: "", details: "", amount: "" });

const isAttachmentAccepted = (file: File) => {
  if (file.type.startsWith("image/")) {
    return true;
  }
  if (file.type.startsWith("video/")) {
    return true;
  }
  if (file.type === "application/pdf") {
    return true;
  }
  if (
    file.type === "application/msword" ||
    file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
  ) {
    return true;
  }
  return false;
};

const inferAttachmentType = (file: File): BidAttachment["type"] => {
  if (file.type.startsWith("image/")) {
    return "photo";
  }
  if (file.type.startsWith("video/")) {
    return "video";
  }
  if (file.type === "application/pdf") {
    return "pdf";
  }
  return "word";
};

export default function BidApplicationForm({ taskId, defaultBidAmount }: BidApplicationFormProps) {
  const [uploadAttachments] = useBidsControllerUploadAttachmentsMutation();
  const [createBid] = useBidsControllerCreateMutation();
  const [files, setFiles] = useState<File[]>([]);
  const [modules, setModules] = useState<ModuleDraft[]>([createEmptyModule()]);
  const [status, setStatus] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const {
    control,
    register,
    handleSubmit,
    watch,
    reset,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<BidApplicationFormValues>({
    resolver: yupResolver(bidApplicationSchema),
    defaultValues: {
      bidAmount: defaultBidAmount,
      coverLetter: "",
      payoutType: "whole",
    },
  });

  const payoutType = watch("payoutType");
  const bidAmount = watch("bidAmount");

  const moduleTotal = useMemo(
    () => modules.reduce((sum, module) => sum + (Number(module.amount) || 0), 0),
    [modules],
  );

  useEffect(() => {
    if (payoutType === "module_based") {
      setValue("bidAmount", moduleTotal, {
        shouldDirty: true,
        shouldValidate: true,
      });
      return;
    }

    if (bidAmount === 0) {
      setValue("bidAmount", defaultBidAmount, {
        shouldDirty: false,
        shouldValidate: true,
      });
    }
  }, [bidAmount, defaultBidAmount, moduleTotal, payoutType, setValue]);

  const updateModule = (index: number, field: keyof ModuleDraft, value: string) => {
    setModules((previousModules) =>
      previousModules.map((module, moduleIndex) => (moduleIndex === index ? { ...module, [field]: value } : module)),
    );
  };

  const addModule = () => {
    setModules((previousModules) => [...previousModules, createEmptyModule()]);
  };

  const removeModule = (index: number) => {
    setModules((previousModules) => {
      if (previousModules.length === 1) {
        return previousModules;
      }
      return previousModules.filter((_, moduleIndex) => moduleIndex !== index);
    });
  };

  const onFilesChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextFiles = Array.from(event.target.files ?? []);
    const acceptedFiles = nextFiles.filter((file) => isAttachmentAccepted(file));
    setFiles((previousFiles) => [...previousFiles, ...acceptedFiles].slice(0, 10));
    event.target.value = "";
  };

  const removeFile = (index: number) => {
    setFiles((previousFiles) => previousFiles.filter((_, fileIndex) => fileIndex !== index));
  };

  const onSubmit = async (values: BidApplicationFormValues) => {
    try {
      setError(null);
      setStatus(null);

      const normalizedModules: BidModule[] =
        values.payoutType === "module_based"
          ? modules
              .map((module) => ({
                title: module.title.trim(),
                details: module.details.trim(),
                amount: Number(module.amount),
              }))
              .filter((module) => module.title && module.details && Number.isFinite(module.amount) && module.amount > 0)
          : [];

      if (values.payoutType === "module_based" && normalizedModules.length === 0) {
        setError("Add at least one valid module before submitting a module-based bid.");
        return;
      }

      const finalBidAmount = values.payoutType === "module_based" ? moduleTotal || Number(values.bidAmount) : Number(values.bidAmount);

      let attachments: BidAttachment[] | undefined;

      if (files.length > 0) {
        const uploadResponse = await uploadAttachments({ body: { files } }).unwrap();
        attachments = (Array.isArray(uploadResponse) ? uploadResponse : []).map((item: unknown, index: number) => {
          const file = files[index];
          const typedItem = item as Partial<BidAttachment> & { fileName?: string; url?: string; sizeMb?: number };

          return {
            fileName: typedItem.fileName ?? file?.name ?? `attachment-${index + 1}`,
            type: typedItem.type ?? inferAttachmentType(file),
            url: typedItem.url ?? "",
            sizeMb: typedItem.sizeMb ?? Number((file.size / (1024 * 1024)).toFixed(2)),
          };
        });
      }

      await createBid({
        createBidDto: {
          taskId,
          bidAmount: finalBidAmount,
          coverLetter: values.coverLetter.trim(),
          payoutType: values.payoutType,
          attachments,
          modules: values.payoutType === "module_based" ? normalizedModules : undefined,
        },
      }).unwrap();

      setStatus("Your bid was submitted successfully.");
      setFiles([]);
      setModules([createEmptyModule()]);
      reset({
        bidAmount: defaultBidAmount,
        coverLetter: "",
        payoutType: "whole",
      });
    } catch (submissionError) {
      const message = getApiErrorMessage(submissionError, "Failed to submit bid.");
      setError(message);
    }
  };

  return (
    <form className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-5 shadow-[0_18px_40px_-30px_rgba(15,23,42,0.4)]" onSubmit={handleSubmit(onSubmit)}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="m-0 text-xs font-bold uppercase tracking-[0.14em] text-[var(--color-text-muted)]">Submit proposal</p>
          <h2 className="mt-1 text-xl font-semibold text-[var(--color-text-main)]">Write your bid</h2>
        </div>
        <span className="rounded-full border border-[var(--color-border)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--color-text-muted)]">
          {payoutType === "module_based" ? "Module bid" : "Whole bid"}
        </span>
      </div>

      <div className="mt-5 grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-medium text-[var(--color-text-main)]">
          Bid amount
          <Controller
            control={control}
            name="bidAmount"
            render={({ field }) => (
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={payoutType === "module_based"}
                value={payoutType === "module_based" ? moduleTotal : field.value ?? ""}
                onChange={(event) => {
                  const nextValue = event.target.value === "" ? 0 : Number(event.target.value);
                  field.onChange(nextValue);
                  setValue("bidAmount", nextValue, { shouldDirty: true, shouldValidate: true });
                }}
                onBlur={field.onBlur}
                name={field.name}
                ref={field.ref}
                className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-brand)]"
              />
            )}
          />
          {errors.bidAmount ? <span className="text-xs text-[var(--color-error)]">{errors.bidAmount.message}</span> : null}
        </label>

        <label className="grid gap-2 text-sm font-medium text-[var(--color-text-main)]">
          Bid mode
          <select
            className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-brand)]"
            {...register("payoutType")}
          >
            <option value="whole">Whole project</option>
            <option value="module_based">Module based</option>
          </select>
          {errors.payoutType ? <span className="text-xs text-[var(--color-error)]">{errors.payoutType.message}</span> : null}
        </label>
      </div>

      {payoutType === "module_based" ? (
        <section className="mt-5 rounded-3xl border border-[color-mix(in_srgb,var(--color-brand)_18%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_45%,var(--color-surface))] p-4">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-main)]">Module breakdown</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Add milestones or phases with their own details and pricing.</p>
          </div>

          <div className="mt-4 grid gap-4">
            {modules.map((module, index) => {
              const isLatestModule = index === modules.length - 1;

              return (
                <div key={`${index}-${module.title}`} className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="m-0 text-sm font-semibold text-[var(--color-text-main)]">Module {index + 1}</p>
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-brand-strong)]"
                      onClick={() => removeModule(index)}
                    >
                      Remove
                    </button>
                  </div>

                  <div className="mt-4 grid gap-3">
                    <input
                      value={module.title}
                      onChange={(event) => updateModule(index, "title", event.target.value)}
                      placeholder="Module title"
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-brand)]"
                    />
                    <textarea
                      rows={3}
                      value={module.details}
                      onChange={(event) => updateModule(index, "details", event.target.value)}
                      placeholder="Describe the work covered by this module"
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm leading-6 text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-brand)]"
                    />
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={module.amount}
                      onChange={(event) => updateModule(index, "amount", event.target.value)}
                      placeholder="Module price"
                      className="rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-brand)]"
                    />
                  </div>

                  {isLatestModule ? (
                    <button
                      type="button"
                      className="mt-4 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--color-brand)_26%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] text-xl font-bold text-[var(--color-brand-strong)] transition hover:scale-105 hover:border-[var(--color-brand)] hover:bg-[var(--color-brand)] hover:text-white"
                      onClick={addModule}
                      aria-label="Add module"
                    >
                      +
                    </button>
                  ) : null}
                </div>
              );
            })}
          </div>

          <p className="mt-3 text-sm text-[var(--color-text-muted)]">Calculated module total: ${moduleTotal.toFixed(2)}</p>
        </section>
      ) : null}

      <label className="mt-4 grid gap-2 text-sm font-medium text-[var(--color-text-main)]">
        Cover letter
        <textarea
          rows={8}
          className="rounded-3xl border border-[var(--color-border)] bg-[var(--color-bg)] px-4 py-3 text-sm leading-6 text-[var(--color-text-main)] outline-none transition focus:border-[var(--color-brand)]"
          placeholder="Tell the client how you will approach the work, what similar results you have delivered, and why you are a fit."
          {...register("coverLetter")}
        />
        {errors.coverLetter ? <span className="text-xs text-[var(--color-error)]">{errors.coverLetter.message}</span> : null}
      </label>

      <section className="mt-5 rounded-3xl border border-[var(--color-border)] bg-[color-mix(in_srgb,var(--color-surface)_90%,var(--color-brand-soft))] p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h3 className="text-base font-semibold text-[var(--color-text-main)]">Attachments</h3>
            <p className="mt-1 text-sm text-[var(--color-text-muted)]">Optional files. Up to 10 total. Accepted formats: images, video, PDF, Word docs.</p>
          </div>
          <label className="inline-flex cursor-pointer items-center rounded-full border border-[var(--color-border)] px-3 py-1.5 text-sm font-semibold text-[var(--color-text-main)] transition hover:border-[var(--color-brand)] hover:text-[var(--color-brand-strong)]">
            Add files
            <input type="file" multiple className="hidden" onChange={onFilesChange} />
          </label>
        </div>

        {files.length ? (
          <div className="mt-4 grid gap-2">
            {files.map((file, index) => (
              <div key={`${file.name}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-surface)] px-4 py-3 text-sm">
                <div>
                  <p className="m-0 font-medium text-[var(--color-text-main)]">{file.name}</p>
                  <p className="m-0 text-xs text-[var(--color-text-muted)]">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
                <button
                  type="button"
                  className="text-sm font-semibold text-[var(--color-text-muted)] transition hover:text-[var(--color-brand-strong)]"
                  onClick={() => removeFile(index)}
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {status ? <p className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-brand)_25%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-brand-soft)_70%,var(--color-surface))] px-4 py-3 text-sm text-[var(--color-brand-strong)]">{status}</p> : null}
      {error ? <p className="mt-4 rounded-2xl border border-[color-mix(in_srgb,var(--color-error)_30%,var(--color-border))] bg-[color-mix(in_srgb,var(--color-error)_12%,var(--color-surface))] px-4 py-3 text-sm text-[var(--color-error)]">{error}</p> : null}

      <div className="mt-6 flex flex-wrap items-center justify-end gap-3">
        <button
          type="submit"
          disabled={isSubmitting}
          className="inline-flex items-center justify-center rounded-full bg-[var(--color-brand)] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[var(--color-brand-strong)] disabled:cursor-not-allowed disabled:opacity-70"
        >
          {isSubmitting ? "Submitting..." : "Submit bid"}
        </button>
      </div>
    </form>
  );
}