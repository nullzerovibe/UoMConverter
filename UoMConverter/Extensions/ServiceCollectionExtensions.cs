using Microsoft.Extensions.DependencyInjection;

namespace UoMConverter.Extensions;

/// <summary>
/// Extension methods for registering UoMConverter services.
/// </summary>
public static class ServiceCollectionExtensions {
    /// <summary>
    /// Adds UoMConverter services to the IServiceCollection.
    /// </summary>
    /// <param name="services">The IServiceCollection to add services to.</param>
    /// <returns>The IServiceCollection for chaining.</returns>
    public static IServiceCollection AddUoMConverter(this IServiceCollection services) {
        // UoMConverter is stateless (backed by static registry) and thread-safe.
        // It pre-computes caches in its constructor, so Singleton is ideal to avoid
        // re-computing these caches on every request.
        services.AddSingleton<IUoMConverter, UoMConverter>();
        return services;
    }
}
