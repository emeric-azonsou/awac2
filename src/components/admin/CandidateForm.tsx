import { useCallback, useEffect, useState, type ChangeEvent } from 'react'
import { Link, useNavigate } from '@tanstack/react-router'
import { api } from '../../utils/api'
import { uploadCandidatePhoto } from '../../utils/imageCompress'
import { CATEGORIES } from '../../utils/candidateCategories'

interface CandidatePhoto {
  id: string
  photo_url: string
  caption: string | null
}

export interface AdminCandidate {
  id: string
  full_name: string
  atelier: string | null
  commune: string | null
  profile_photo_url: string | null
  category: string
}

export function CandidateForm({ candidate }: { candidate: AdminCandidate | null }) {
  const navigate = useNavigate()
  const isEdit = Boolean(candidate)

  const [form, setForm] = useState({
    full_name: candidate?.full_name ?? '',
    atelier: candidate?.atelier ?? '',
    commune: candidate?.commune ?? '',
    profile_photo_url: candidate?.profile_photo_url ?? '',
    category: candidate?.category ?? '',
  })
  const [photos, setPhotos] = useState<CandidatePhoto[]>([])
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [uploadingProfile, setUploadingProfile] = useState(false)
  const [uploadingWork, setUploadingWork] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [deleteConfirmName, setDeleteConfirmName] = useState('')

  // La suppression n'est déverrouillée que si le nom saisi correspond
  // exactement à celui du candidat : garde-fou repris de la version Vue.
  const canDelete = deleteConfirmName.trim() === candidate?.full_name.trim()

  const loadPhotos = useCallback(async () => {
    if (!candidate) return
    try {
      const data = await api.get<{ photos: CandidatePhoto[] }>(`/candidates/${candidate.id}`)
      setPhotos(data.photos ?? [])
    } catch {
      setPhotos([])
    }
  }, [candidate])

  useEffect(() => {
    void loadPhotos()
  }, [loadPhotos])

  const onProfileSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setUploadingProfile(true)
    setErrorMessage('')
    try {
      const uploaded = await uploadCandidatePhoto(file)
      setForm((current) => ({ ...current, profile_photo_url: uploaded.url }))
    } catch {
      setErrorMessage("Échec de l'envoi de la photo.")
    } finally {
      setUploadingProfile(false)
    }
  }

  const onWorkSelected = async (event: ChangeEvent<HTMLInputElement>) => {
    const input = event.target
    const file = input.files?.[0]
    if (!file || !candidate) return
    setUploadingWork(true)
    setErrorMessage('')
    try {
      const uploaded = await uploadCandidatePhoto(file)
      await api.post(`/admin/candidates/${candidate.id}/photos`, { blob_id: uploaded.id })
      await loadPhotos()
    } catch {
      setErrorMessage("Échec de l'ajout de la réalisation.")
    } finally {
      setUploadingWork(false)
      input.value = ''
    }
  }

  const removePhoto = async (photoId: string) => {
    try {
      await api.request(`/admin/photos/${photoId}`, 'DELETE')
      setPhotos((current) => current.filter((photo) => photo.id !== photoId))
    } catch {
      setErrorMessage('Impossible de supprimer la photo.')
    }
  }

  const save = async () => {
    if (!form.full_name.trim()) {
      setErrorMessage('Le nom du candidat est requis.')
      return
    }
    if (!form.category) {
      setErrorMessage('La catégorie est requise.')
      return
    }
    setSaving(true)
    setErrorMessage('')
    try {
      if (candidate) {
        await api.request(`/admin/candidates/${candidate.id}`, 'PATCH', form)
      } else {
        await api.post('/admin/candidates', form)
      }
      void navigate({
        to: '/admin/candidats',
        search: { saved: candidate ? 'updated' : 'created' },
      })
    } catch {
      setErrorMessage("Échec de l'enregistrement.")
    } finally {
      setSaving(false)
    }
  }

  const removeCandidate = async () => {
    if (!candidate || !canDelete) return
    setDeleting(true)
    try {
      await api.request(`/admin/candidates/${candidate.id}`, 'DELETE')
      void navigate({ to: '/admin/candidats', search: { saved: 'deleted' } })
    } catch {
      setErrorMessage('Échec de la suppression.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="max-w-3xl space-y-8">
      <div className="flex items-center gap-3">
        <Link
          to="/admin/candidats"
          className="grid place-items-center w-10 h-10 rounded-xl border border-gray-200 text-gray-500 hover:text-awac-primary hover:border-awac-primary transition-colors"
          aria-label="Retour à la liste"
        >
          <span className="material-icons">arrow_back</span>
        </Link>
        <h1 className="text-gray-900 font-heading font-black text-2xl md:text-3xl tracking-tight uppercase">
          {isEdit ? 'Modifier le candidat' : 'Nouveau candidat'}
        </h1>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-8">
        <div className="flex items-center gap-5">
          <div className="w-24 h-24 rounded-2xl overflow-hidden bg-gray-100 shrink-0 border border-gray-200">
            {form.profile_photo_url ? (
              <img
                src={form.profile_photo_url}
                alt="Photo de profil"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full grid place-items-center text-gray-300">
                <span className="material-icons text-3xl">person</span>
              </div>
            )}
          </div>
          <div className="space-y-2">
            <label className="admin-upload-btn">
              <span className="material-icons text-base">photo_camera</span>
              {uploadingProfile ? 'Envoi…' : 'Photo de profil'}
              <input
                type="file"
                accept="image/*"
                className="hidden"
                disabled={uploadingProfile}
                onChange={(event) => void onProfileSelected(event)}
              />
            </label>
            <p className="text-xs text-gray-400">JPEG, PNG ou WebP. Compressée automatiquement.</p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="space-y-1">
            <label htmlFor="cand-name" className="admin-label">
              Nom complet <span className="text-red-500">*</span>
            </label>
            <input
              id="cand-name"
              value={form.full_name}
              onChange={(event) =>
                setForm((current) => ({ ...current, full_name: event.target.value }))
              }
              type="text"
              className="admin-input"
            />
          </div>

          <fieldset className="space-y-1">
            <legend className="admin-label">
              Catégorie <span className="text-red-500">*</span>
            </legend>
            <div className="flex gap-3">
              {CATEGORIES.map((cat) => (
                <label
                  key={cat.key}
                  className={`flex items-center gap-2 border rounded-xl px-4 min-h-[44px] cursor-pointer transition-colors ${
                    form.category === cat.key
                      ? 'border-awac-primary text-awac-primary bg-awac-primary/5'
                      : 'border-gray-200 text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <input
                    checked={form.category === cat.key}
                    onChange={() => setForm((current) => ({ ...current, category: cat.key }))}
                    type="radio"
                    name="cand-category"
                    value={cat.key}
                    className="accent-[#EF7952]"
                  />
                  <span className="text-sm font-semibold">{cat.labelPerson}</span>
                </label>
              ))}
            </div>
          </fieldset>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label htmlFor="cand-atelier" className="admin-label">
                Atelier
              </label>
              <input
                id="cand-atelier"
                value={form.atelier}
                onChange={(event) =>
                  setForm((current) => ({ ...current, atelier: event.target.value }))
                }
                type="text"
                className="admin-input"
              />
            </div>
            <div className="space-y-1">
              <label htmlFor="cand-commune" className="admin-label">
                Commune
              </label>
              <input
                id="cand-commune"
                value={form.commune}
                onChange={(event) =>
                  setForm((current) => ({ ...current, commune: event.target.value }))
                }
                type="text"
                className="admin-input"
              />
            </div>
          </div>
        </div>

        {errorMessage ? <p className="text-sm text-red-500">{errorMessage}</p> : null}

        <button
          className="btn-awac w-full sm:w-auto text-[11px] py-3.5 px-8"
          disabled={saving}
          onClick={() => void save()}
        >
          {saving ? (
            <span className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
          ) : null}
          {isEdit ? 'Enregistrer' : 'Créer le candidat'}
        </button>
      </div>

      {isEdit ? (
        <>
          <section className="bg-white border border-gray-200 rounded-2xl p-6 md:p-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-black text-sm text-gray-900 uppercase tracking-widest">
                Réalisations
              </h2>
              <label className="admin-upload-btn">
                <span className="material-icons text-base">add_photo_alternate</span>
                {uploadingWork ? 'Envoi…' : 'Ajouter'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={uploadingWork}
                  onChange={(event) => void onWorkSelected(event)}
                />
              </label>
            </div>

            {photos.length === 0 ? (
              <div className="text-center py-8 text-sm text-gray-400">
                Aucune réalisation pour l&apos;instant.
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {photos.map((photo) => (
                  <figure
                    key={photo.id}
                    className="relative group rounded-xl overflow-hidden bg-gray-100 border border-gray-200"
                  >
                    <img
                      src={photo.photo_url}
                      alt={photo.caption || 'Réalisation'}
                      className="w-full h-32 object-cover"
                    />
                    <button
                      className="absolute top-2 right-2 grid place-items-center w-9 h-9 rounded-full bg-black/60 text-white transition-colors hover:bg-red-600 focus-visible:opacity-100 md:opacity-0 md:group-hover:opacity-100 md:focus-within:opacity-100"
                      aria-label="Supprimer la photo"
                      onClick={() => void removePhoto(photo.id)}
                    >
                      <span className="material-icons text-base">delete</span>
                    </button>
                  </figure>
                ))}
              </div>
            )}
          </section>

          <section className="bg-white border border-red-100 rounded-2xl p-6 md:p-8 space-y-3">
            <h2 className="font-heading font-black text-sm text-red-600 uppercase tracking-widest">
              Supprimer ce candidat
            </h2>
            <p className="text-xs text-gray-500">
              Le candidat disparaît de la vitrine. Ses votes et paiements sont conservés pour la
              comptabilité. Pour confirmer, saisissez son nom :{' '}
              <strong>{candidate?.full_name}</strong>
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={deleteConfirmName}
                onChange={(event) => setDeleteConfirmName(event.target.value)}
                type="text"
                className="admin-input sm:flex-1"
                placeholder="Nom du candidat"
              />
              <button
                className="flex items-center justify-center gap-2 border border-red-200 text-red-600 font-heading font-black text-[11px] tracking-widest uppercase py-3 px-6 rounded-xl transition-colors hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed"
                disabled={!canDelete || deleting}
                onClick={() => void removeCandidate()}
              >
                {deleting ? (
                  <span className="animate-spin w-4 h-4 border-2 border-red-500 border-t-transparent rounded-full" />
                ) : null}
                Supprimer
              </button>
            </div>
          </section>
        </>
      ) : null}
    </div>
  )
}
