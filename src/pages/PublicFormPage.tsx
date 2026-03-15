import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Loader2, CheckCircle2, AlertTriangle, Send, Mountain } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api-client';
import type { QRForm, FormField } from '@shared/types';
import { Skeleton } from '@/components/ui/skeleton';
export function PublicFormPage() {
  const { id } = useParams<{ id: string }>();
  const [form, setForm] = useState<QRForm | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState<Record<string, any>>({});
  useEffect(() => {
    if (id) {
      fetchForm(id);
    }
  }, [id]);
  const fetchForm = async (formId: string) => {
    setLoading(true);
    setError(null);
    try {
      const data = await api<QRForm>(`/api/public/qr-forms/${formId}`);
      setForm(data);
      // Initialize form data
      const initial: Record<string, any> = {};
      data.fields.forEach(f => {
        initial[f.id] = f.type === 'checkbox' ? false : '';
      });
      setFormData(initial);
    } catch (err) {
      console.error(err);
      setError('Form not found or is unavailable.');
    } finally {
      setLoading(false);
    }
  };
  const handleChange = (fieldId: string, value: any) => {
    setFormData(prev => ({ ...prev, [fieldId]: value }));
    if (validationError) setValidationError(null);
  };
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form || !id) return;
    // Client-side validation
    const missingFields = form.fields.filter(f => f.required && !formData[f.id]);
    if (missingFields.length > 0) {
      setValidationError(`Please fill in all required fields: ${missingFields.map(f => f.label).join(', ')}`);
      return;
    }
    setSubmitting(true);
    setValidationError(null);
    try {
      await api('/api/public/submissions', {
        method: 'POST',
        body: JSON.stringify({
          formId: id,
          data: formData
        })
      });
      setSubmitted(true);
    } catch (err) {
      console.error(err);
      setError('Failed to submit form. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  if (loading) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg animate-in fade-in zoom-in-95 duration-500">
          <CardHeader className="space-y-3 pb-6">
            <Skeleton className="h-8 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-full" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2"><Skeleton className="h-4 w-1/4" /><Skeleton className="h-10 w-full" /></div>
            <div className="space-y-2"><Skeleton className="h-4 w-1/3" /><Skeleton className="h-24 w-full" /></div>
            <Skeleton className="h-12 w-full mt-8" />
          </CardContent>
        </Card>
      </div>
    );
  }
  if (error || !form) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg text-center p-6 py-12 animate-in fade-in zoom-in-95 duration-500">
          <AlertTriangle className="mx-auto h-12 w-12 text-rose-500 mb-4" />
          <h2 className="text-xl font-bold mb-2">Unavailable</h2>
          <p className="text-muted-foreground">{error || 'Could not load form'}</p>
        </Card>
      </div>
    );
  }
  if (submitted) {
    return (
      <div className="min-h-screen bg-muted/10 flex items-center justify-center p-4">
        <Card className="w-full max-w-md mx-auto shadow-lg text-center p-6 py-12 animate-in fade-in zoom-in-95 duration-500 border-t-4 border-t-emerald-500">
          <div className="h-20 w-20 bg-emerald-100 dark:bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="h-10 w-10 text-emerald-600 dark:text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold mb-2">Request Submitted</h2>
          <p className="text-muted-foreground mb-8">
            Thank you! Your request has been automatically routed to our team and a task has been created.
          </p>
          <Button variant="outline" onClick={() => window.location.reload()} className="w-full max-w-[200px]">
            Submit Another
          </Button>
        </Card>
      </div>
    );
  }
  const renderField = (field: FormField) => {
    switch (field.type) {
      case 'textarea':
        return (
          <Textarea
            id={field.id}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            className="min-h-[100px] resize-y"
            placeholder="Type your answer here..."
          />
        );
      case 'select':
        return (
          <Select
            required={field.required}
            value={formData[field.id] || ''}
            onValueChange={(val) => handleChange(field.id, val)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {field.options?.map((opt, i) => (
                <SelectItem key={i} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      case 'checkbox':
        return (
          <div className="flex items-start space-x-3 pt-1">
            <Checkbox
              id={field.id}
              checked={!!formData[field.id]}
              onCheckedChange={(checked) => handleChange(field.id, checked)}
              className="mt-1"
            />
            <label
              htmlFor={field.id}
              className="text-sm font-medium leading-relaxed peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
            >
              Confirm: {field.label}
              {field.required && <span className="text-rose-500 ml-1.5">*</span>}
            </label>
          </div>
        );
      default:
        return (
          <Input
            type="text"
            id={field.id}
            required={field.required}
            value={formData[field.id] || ''}
            onChange={(e) => handleChange(field.id, e.target.value)}
            placeholder="Your answer"
          />
        );
    }
  };
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex flex-col items-center justify-start p-4 py-8 sm:py-12">
      <div className="w-full max-w-md mx-auto mb-6 text-center">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm mb-4">
          <Send className="h-6 w-6" />
        </div>
      </div>
      <Card className="w-full max-w-md mx-auto shadow-xl border-t-4 border-t-primary animate-in slide-in-from-bottom-8 duration-700">
        <CardHeader className="text-center pb-8 border-b bg-muted/10">
          <CardTitle className="text-2xl">{form.title}</CardTitle>
          {form.description && (
            <CardDescription className="text-base mt-2">{form.description}</CardDescription>
          )}
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6 pt-8">
            {validationError && (
              <div className="p-3 rounded-md bg-destructive/10 border border-destructive/20 text-destructive text-sm flex items-center gap-2 animate-in fade-in slide-in-from-top-1">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <p>{validationError}</p>
              </div>
            )}
            {form.fields.map((field) => (
              <div key={field.id} className="space-y-2.5">
                {field.type !== 'checkbox' && (
                  <Label htmlFor={field.id} className="text-base flex items-center">
                    {field.label}
                    {field.required && <span className="text-rose-500 ml-1.5">*</span>}
                  </Label>
                )}
                {renderField(field)}
              </div>
            ))}
          </CardContent>
          <CardFooter className="bg-muted/10 pt-6 border-t rounded-b-xl">
            <Button
              type="submit"
              className="w-full h-12 text-lg font-medium shadow-md hover:shadow-lg transition-all"
              disabled={submitting}
            >
              {submitting ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Submitting...
                </>
              ) : (
                'Submit Request'
              )}
            </Button>
          </CardFooter>
        </form>
      </Card>
      <div className="mt-10 flex flex-col items-center justify-center opacity-80 hover:opacity-100 transition-opacity">
        <div className="flex items-center gap-3 mb-1.5">
          <div className="h-10 w-10 flex items-center justify-center shrink-0 bg-primary/10 rounded-xl border border-primary/20 text-primary">
            <Mountain className="h-6 w-6" />
          </div>
          <span className="font-bold tracking-tight text-lg text-foreground font-bookman">Highland View Resort</span>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">Customer Service Portal</span>
      </div>
    </div>
  );
}